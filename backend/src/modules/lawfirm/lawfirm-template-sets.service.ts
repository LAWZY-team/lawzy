import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { sanitizeHtmlSafe } from '../../common/sanitize-html';
import { fixUploadFilename } from '../../common/fix-upload-filename';
import { FilesService } from '../files/files.service';
import { LawfirmAuditService } from './lawfirm-audit.service';
import { LawfirmScanService } from './lawfirm-scan.service';
import {
  serializeTemplateDocument,
  serializeTemplateSet,
} from './utils/lawfirm-serializer';
import {
  CreateTemplateSetDto,
  UpdateTemplateDocumentDto,
  UpdateTemplateSetDto,
} from './dto/template-set.dto';
import { LAWFIRM_MAX_UPLOAD_BYTES, LAWFIRM_TEMPLATE_MIMES } from './lawfirm.constants';

@Injectable()
export class LawfirmTemplateSetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly filesService: FilesService,
    private readonly auditService: LawfirmAuditService,
    private readonly scanService: LawfirmScanService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const [owned, publicSets] = await Promise.all([
      this.prisma.lawfirmTemplateSet.findMany({
        where: { workspaceId },
        include: {
          documents: { include: { fields: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.lawfirmTemplateSet.findMany({
        where: {
          visibility: 'public',
          workspaceId: { not: workspaceId },
        },
        include: {
          documents: { include: { fields: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return [
      ...owned.map((set) =>
        serializeTemplateSet(set, { isOwner: true, readOnly: false }),
      ),
      ...publicSets.map((set) =>
        serializeTemplateSet(set, { isOwner: false, readOnly: true }),
      ),
    ];
  }

  async getById(userId: string, id: string) {
    const set = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
      include: {
        documents: { include: { fields: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!set) throw new NotFoundException('Template set not found');
    const isOwner = await this.workspaceAccess.hasMembership(set.workspaceId, userId);
    if (!isOwner && set.visibility !== 'public') {
      throw new NotFoundException('Template set not found');
    }
    if (isOwner) {
      await this.workspaceAccess.requireMembership(set.workspaceId, userId);
    }
    return serializeTemplateSet(set, { isOwner, readOnly: !isOwner });
  }

  async create(userId: string, dto: CreateTemplateSetDto) {
    await this.workspaceAccess.requireMembership(dto.workspaceId, userId);
    const set = await this.prisma.lawfirmTemplateSet.create({
      data: {
        workspaceId: dto.workspaceId,
        createdBy: userId,
        name: dto.name.trim(),
        status: dto.status ?? 'draft',
        visibility: dto.visibility ?? 'private',
      },
      include: { documents: { include: { fields: true } } },
    });
    await this.auditService.logAudit({
      workspaceId: dto.workspaceId,
      actorId: userId,
      action: 'template_set.create',
      entityType: 'lawfirm_template_set',
      entityId: set.id,
    });
    return serializeTemplateSet(set, { isOwner: true, readOnly: false });
  }

  async update(userId: string, id: string, dto: UpdateTemplateSetDto) {
    const existing = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Template set not found');
    await this.assertOwner(userId, existing.workspaceId);
    if (dto.visibility !== undefined && dto.visibility !== existing.visibility) {
      await this.assertOwner(userId, existing.workspaceId);
    }
    const result = await this.prisma.lawfirmTemplateSet.updateMany({
      where: { id, revision: dto.revision },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        revision: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConflictException('Template set was modified by another user');
    }
    const updated = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
      include: {
        documents: { include: { fields: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    await this.auditService.logAudit({
      workspaceId: existing.workspaceId,
      actorId: userId,
      action: 'template_set.update',
      entityType: 'lawfirm_template_set',
      entityId: id,
    });
    return serializeTemplateSet(updated!, { isOwner: true, readOnly: false });
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Template set not found');
    await this.assertOwner(userId, existing.workspaceId);
    await this.prisma.lawfirmTemplateSet.delete({ where: { id } });
    await this.auditService.logAudit({
      workspaceId: existing.workspaceId,
      actorId: userId,
      action: 'template_set.delete',
      entityType: 'lawfirm_template_set',
      entityId: id,
    });
    return { success: true };
  }

  async uploadDocument(
    userId: string,
    templateSetId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    this.scanService.validateMimeAndSize(
      file.mimetype,
      file.size,
      LAWFIRM_TEMPLATE_MIMES,
    );
    const set = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id: templateSetId },
    });
    if (!set) throw new NotFoundException('Template set not found');
    await this.assertOwner(userId, set.workspaceId);
    const uploaded = await this.filesService.upload({
      file,
      userId,
      workspaceId: set.workspaceId,
      category: 'template',
    });
    const fileName = uploaded.name;
    const analysis = await this.scanService.analyzeUploadedTemplateFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName,
    });
    const document = await this.prisma.lawfirmTemplateDocument.create({
      data: {
        templateSetId,
        fileName,
        fileType: analysis.fileType,
        status: 'draft',
        storageKey: uploaded.s3Key,
        plainText: analysis.plainText,
        fileId: uploaded.id,
        fields: {
          create: analysis.fields.map((field, index) => ({
            label: field.label,
            placeholder: field.placeholder,
            mappedKey: field.mappedKey,
            source: 'auto',
            count: field.count,
            sortOrder: index,
          })),
        },
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    await this.auditService.logAudit({
      workspaceId: set.workspaceId,
      actorId: userId,
      action: 'template_document.upload',
      entityType: 'lawfirm_template_document',
      entityId: document.id,
    });
    return serializeTemplateDocument(document, { readOnly: false });
  }

  async updateDocument(
    userId: string,
    docId: string,
    dto: UpdateTemplateDocumentDto,
  ) {
    const document = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: docId },
      include: { templateSet: true },
    });
    if (!document) throw new NotFoundException('Template document not found');
    await this.assertOwner(userId, document.templateSet.workspaceId);
    await this.prisma.$transaction(async (tx) => {
      await tx.lawfirmTemplateDocument.update({
        where: { id: docId },
        data: {
          ...(dto.fileName !== undefined && {
            fileName: fixUploadFilename(dto.fileName),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.previewMode !== undefined && { previewMode: dto.previewMode }),
          ...(dto.previewHtml !== undefined && {
            previewHtml: sanitizeHtmlSafe(dto.previewHtml),
          }),
          ...(dto.plainText !== undefined && { plainText: dto.plainText }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
      });
      if (dto.fields) {
        const incomingIds = dto.fields
          .map((field) => field.id?.trim())
          .filter((fieldId): fieldId is string => Boolean(fieldId));
        await tx.lawfirmTemplateField.deleteMany({
          where: {
            documentId: docId,
            ...(incomingIds.length
              ? { id: { notIn: incomingIds } }
              : {}),
          },
        });
        for (const [index, field] of dto.fields.entries()) {
          const data = {
            documentId: docId,
            label: field.label,
            placeholder: field.placeholder,
            mappedKey: field.mappedKey ?? '',
            source: field.source ?? 'manual',
            count: field.count ?? 1,
            sortOrder: field.sortOrder ?? index,
          };
          if (field.id?.trim()) {
            await tx.lawfirmTemplateField.upsert({
              where: { id: field.id },
              update: data,
              create: {
                id: field.id,
                ...data,
              },
            });
            continue;
          }
          await tx.lawfirmTemplateField.create({ data });
        }
      }
    });
    const updated = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: docId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    return serializeTemplateDocument(updated!, { readOnly: false });
  }

  async deleteDocument(userId: string, docId: string) {
    const document = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: docId },
      include: { templateSet: true },
    });
    if (!document) throw new NotFoundException('Template document not found');
    await this.assertOwner(userId, document.templateSet.workspaceId);
    await this.prisma.lawfirmTemplateDocument.delete({ where: { id: docId } });
    await this.auditService.logAudit({
      workspaceId: document.templateSet.workspaceId,
      actorId: userId,
      action: 'template_document.delete',
      entityType: 'lawfirm_template_document',
      entityId: docId,
    });
    return { success: true };
  }

  async scanDocument(
    userId: string,
    documentId: string,
    options?: { useAi?: boolean },
  ) {
    const result = await this.scanService.scanTemplateDocument(
      userId,
      documentId,
      options,
    );
    return {
      document_id: documentId,
      deterministic: result.deterministic,
      ai: result.ai,
      note: 'Suggestions are not auto-applied. Review and update fields manually.',
    };
  }

  private async assertOwner(userId: string, workspaceId: string): Promise<void> {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
  }
}
