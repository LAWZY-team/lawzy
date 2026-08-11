import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
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
  ReorderTemplateDocumentsDto,
  UpdateTemplateDocumentDto,
  UpdateTemplateSetDto,
} from './dto/template-set.dto';
import { LAWFIRM_TEMPLATE_MIMES } from './lawfirm.constants';
import { normalizeTemplateMappedKey } from './lawfirm-field-taxonomy';
import { LawfirmTemplateSetIndexService } from './lawfirm-template-set-index.service';

@Injectable()
export class LawfirmTemplateSetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly filesService: FilesService,
    private readonly auditService: LawfirmAuditService,
    private readonly scanService: LawfirmScanService,
    private readonly templateSetIndex: LawfirmTemplateSetIndexService,
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
        description: dto.description?.trim() ?? null,
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
        ...(dto.description !== undefined && { description: dto.description.trim() }),
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
    await this.templateSetIndex.rebuild(templateSetId);
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
        const normalizedFields = dto.fields.map((field) => {
          const mappedKey = normalizeTemplateMappedKey(field.mappedKey);
          if (mappedKey === undefined) {
            throw new BadRequestException({
              code: 'INVALID_TEMPLATE_FIELD_MAPPING',
              message: `Unsupported mappedKey: ${field.mappedKey}`,
              fieldId: field.id,
              placeholder: field.placeholder,
            });
          }
          return { ...field, mappedKey };
        });
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
        for (const [index, field] of normalizedFields.entries()) {
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
    if (dto.fields) {
      await this.templateSetIndex.rebuild(document.templateSetId);
    }
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
    await this.prisma.$transaction([
      this.prisma.lawfirmAiExtraction.deleteMany({
        where: { documentId: docId, kind: 'template_scan' },
      }),
      this.prisma.lawfirmTemplateDocument.delete({ where: { id: docId } }),
    ]);
    await this.templateSetIndex.rebuild(document.templateSetId);
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
    const document = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: documentId },
      include: { templateSet: true },
    });
    if (!document) throw new NotFoundException('Template document not found');
    await this.assertOwner(userId, document.templateSet.workspaceId);

    const contentHash = createHash('sha256')
      .update(document.plainText || document.storageKey)
      .digest('hex');
    const idempotencyKey = `template-scan:${documentId}`;
    const cached = await this.prisma.lawfirmAiExtraction.findUnique({
      where: { idempotencyKey },
    });
    const cachedProvenance = cached?.provenance as
      | {
          contentHash?: string;
          deterministic?: Array<{
            placeholder: string;
            mappedKey: string;
            label: string;
            confidence: number;
            source: 'deterministic' | 'ai';
          }>;
        }
      | null;
    if (
      cached?.status === 'pending' &&
      cachedProvenance?.contentHash === contentHash &&
      Array.isArray(cached.suggestions)
    ) {
      return {
        document_id: documentId,
        deterministic: cachedProvenance.deterministic ?? [],
        ai: cached.suggestions,
        state: 'ready_for_review',
        cached: true,
        note: 'Persisted suggestions restored. Review before applying.',
      };
    }

    const result = await this.scanService.scanTemplateDocument(
      userId,
      documentId,
      options,
    );
    await this.prisma.lawfirmAiExtraction.upsert({
      where: { idempotencyKey },
      update: {
        status: 'pending',
        suggestions: result.ai as unknown as Prisma.InputJsonValue,
        provenance: {
          contentHash,
          deterministic: result.deterministic,
        } as unknown as Prisma.InputJsonValue,
        errorMessage: null,
        expiresAt: null,
      },
      create: {
        workspaceId: document.templateSet.workspaceId,
        documentId,
        createdBy: userId,
        kind: 'template_scan',
        status: 'pending',
        suggestions: result.ai as unknown as Prisma.InputJsonValue,
        provenance: {
          contentHash,
          deterministic: result.deterministic,
        } as unknown as Prisma.InputJsonValue,
        modelName: options?.useAi === false ? null : 'gemini',
        idempotencyKey,
      },
    });
    return {
      document_id: documentId,
      deterministic: result.deterministic,
      ai: result.ai,
      state: 'ready_for_review',
      cached: false,
      note: 'Suggestions are not auto-applied. Review and update fields manually.',
    };
  }

  async reorderDocuments(
    userId: string,
    id: string,
    dto: ReorderTemplateDocumentsDto,
  ) {
    const existing = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
      include: { documents: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Template set not found');
    await this.assertOwner(userId, existing.workspaceId);

    const persistedIds = new Set(existing.documents.map((item) => item.id));
    const hasExactDocumentSet =
      persistedIds.size === dto.documentIds.length &&
      dto.documentIds.every((documentId) => persistedIds.has(documentId));
    if (!hasExactDocumentSet) {
      throw new BadRequestException(
        'documentIds must contain every template document exactly once',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const revisionUpdate = await tx.lawfirmTemplateSet.updateMany({
        where: { id, revision: dto.revision },
        data: { revision: { increment: 1 } },
      });
      if (revisionUpdate.count === 0) {
        throw new ConflictException('Template set was modified by another user');
      }
      await Promise.all(
        dto.documentIds.map((documentId, sortOrder) =>
          tx.lawfirmTemplateDocument.update({
            where: { id: documentId },
            data: { sortOrder },
          }),
        ),
      );
    });

    const updated = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id },
      include: {
        documents: {
          include: { fields: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    await this.auditService.logAudit({
      workspaceId: existing.workspaceId,
      actorId: userId,
      action: 'template_document.reorder',
      entityType: 'lawfirm_template_set',
      entityId: id,
      metadata: { documentIds: dto.documentIds },
    });
    return serializeTemplateSet(updated!, { isOwner: true, readOnly: false });
  }

  private async assertOwner(userId: string, workspaceId: string): Promise<void> {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
  }
}
