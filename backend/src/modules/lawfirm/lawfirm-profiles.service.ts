import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { FilesService } from '../files/files.service';
import { LawfirmAuditService } from './lawfirm-audit.service';
import { LawfirmScanService } from './lawfirm-scan.service';
import { LawfirmR2Helper } from './utils/lawfirm-r2.helper';
import { serializeExtraction, serializeProfile } from './utils/lawfirm-serializer';
import {
  CreateProfileDto,
  ImportLocalDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { CreateExtractionDto } from './dto/extraction.dto';
import { LAWFIRM_IDENTITY_MIMES } from './lawfirm.constants';

@Injectable()
export class LawfirmProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly filesService: FilesService,
    private readonly auditService: LawfirmAuditService,
    private readonly scanService: LawfirmScanService,
    private readonly r2Helper: LawfirmR2Helper,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const profiles = await this.prisma.lawfirmClientProfile.findMany({
      where: { workspaceId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return profiles.map(serializeProfile);
  }

  async getById(userId: string, id: string) {
    const profile = await this.prisma.lawfirmClientProfile.findUnique({
      where: { id },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    await this.workspaceAccess.requireMembership(profile.workspaceId, userId);
    return serializeProfile(profile);
  }

  async create(userId: string, dto: CreateProfileDto) {
    await this.workspaceAccess.requireMembership(dto.workspaceId, userId);
    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lawfirmClientProfile.create({
        data: {
          workspaceId: dto.workspaceId,
          createdBy: userId,
          name: dto.name.trim(),
          investorType: dto.investorType ?? 'organization',
          fields: {
            create: dto.fields.map((field, index) => ({
              fieldKey: field.fieldKey,
              group: field.group,
              label: field.label,
              value: field.value,
              aliases: field.aliases ?? '',
              sortOrder: field.sortOrder ?? index,
            })),
          },
        },
        include: { fields: { orderBy: { sortOrder: 'asc' } } },
      });
      return created;
    });
    await this.auditService.logAudit({
      workspaceId: dto.workspaceId,
      actorId: userId,
      action: 'profile.create',
      entityType: 'lawfirm_client_profile',
      entityId: profile.id,
    });
    return serializeProfile(profile);
  }

  async update(userId: string, id: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.lawfirmClientProfile.findUnique({
      where: { id },
      include: { fields: true },
    });
    if (!existing) throw new NotFoundException('Profile not found');
    await this.workspaceAccess.requireMembership(existing.workspaceId, userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lawfirmClientProfile.updateMany({
        where: { id, revision: dto.revision },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.investorType !== undefined && { investorType: dto.investorType }),
          ...(dto.status !== undefined && { status: dto.status }),
          revision: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new ConflictException('Profile was modified by another user');
      }
      if (dto.fields) {
        await tx.lawfirmProfileField.deleteMany({ where: { profileId: id } });
        await tx.lawfirmProfileField.createMany({
          data: dto.fields.map((field, index) => ({
            profileId: id,
            fieldKey: field.fieldKey,
            group: field.group,
            label: field.label,
            value: field.value,
            aliases: field.aliases ?? '',
            sortOrder: field.sortOrder ?? index,
          })),
        });
      }
      return tx.lawfirmClientProfile.findUnique({
        where: { id },
        include: { fields: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    if (!updated) throw new NotFoundException('Profile not found');
    await this.auditService.logAudit({
      workspaceId: existing.workspaceId,
      actorId: userId,
      action: 'profile.update',
      entityType: 'lawfirm_client_profile',
      entityId: id,
      metadata: { revision: dto.revision },
    });
    return serializeProfile(updated);
  }

  async delete(userId: string, id: string) {
    const existing = await this.prisma.lawfirmClientProfile.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Profile not found');
    await this.workspaceAccess.requireMembership(existing.workspaceId, userId);
    await this.prisma.lawfirmClientProfile.delete({ where: { id } });
    await this.auditService.logAudit({
      workspaceId: existing.workspaceId,
      actorId: userId,
      action: 'profile.delete',
      entityType: 'lawfirm_client_profile',
      entityId: id,
    });
    return { success: true };
  }

  async createExtraction(
    userId: string,
    profileId: string,
    file: Express.Multer.File,
    dto: CreateExtractionDto,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const profile = await this.prisma.lawfirmClientProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    await this.workspaceAccess.requireMembership(profile.workspaceId, userId);
    if (dto.idempotencyKey) {
      const existing = await this.prisma.lawfirmAiExtraction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return serializeExtraction(existing);
    }
    this.scanService.validateMimeAndSize(
      file.mimetype,
      file.size,
      LAWFIRM_IDENTITY_MIMES,
    );
    const uploaded = await this.filesService.upload({
      file,
      userId,
      workspaceId: profile.workspaceId,
      category: 'input_upload',
    });
    const storageKey = uploaded.s3Key;
    const extractionResult = await this.scanService.extractIdentityFromUpload({
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      storageKey,
    });
    const extraction = await this.prisma.lawfirmAiExtraction.create({
      data: {
        workspaceId: profile.workspaceId,
        profileId,
        createdBy: userId,
        kind: 'identity_document',
        status: 'pending',
        suggestions: extractionResult.suggestions as unknown as Prisma.InputJsonValue,
        provenance: extractionResult.provenance as unknown as Prisma.InputJsonValue,
        storageKey,
        modelName: 'gemini',
        idempotencyKey: dto.idempotencyKey ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    await this.auditService.logAudit({
      workspaceId: profile.workspaceId,
      actorId: userId,
      action: 'extraction.create',
      entityType: 'lawfirm_ai_extraction',
      entityId: extraction.id,
      metadata: { profileId, kind: 'identity_document' },
    });
    return serializeExtraction(extraction);
  }

  async importLocal(userId: string, dto: ImportLocalDto) {
    await this.workspaceAccess.requireMembership(dto.workspaceId, userId);
    const recentImports = await this.prisma.lawfirmAuditEvent.findMany({
      where: {
        workspaceId: dto.workspaceId,
        action: 'profile.import_local',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const existingImport = recentImports.find((event) => {
      const metadata = event.metadata as { hash?: string } | null;
      return metadata?.hash === dto.hash;
    });
    if (existingImport) {
      const profiles = await this.prisma.lawfirmClientProfile.findMany({
        where: { workspaceId: dto.workspaceId },
        include: { fields: { orderBy: { sortOrder: 'asc' } } },
      });
      const templateSets = await this.prisma.lawfirmTemplateSet.findMany({
        where: { workspaceId: dto.workspaceId },
        include: {
          documents: { include: { fields: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      return {
        already_imported: true,
        profiles: profiles.map(serializeProfile),
        template_sets_count: templateSets.length,
      };
    }
    await this.prisma.$transaction(async (tx) => {
      for (const profile of dto.data.profiles) {
        await tx.lawfirmClientProfile.create({
          data: {
            workspaceId: dto.workspaceId,
            createdBy: userId,
            name: profile.name,
            investorType: profile.investorType,
            fields: {
              create: profile.fields.map((field, index) => ({
                fieldKey: field.id,
                group: field.group,
                label: field.label,
                value: field.value,
                aliases: field.aliases,
                sortOrder: index,
              })),
            },
          },
        });
      }
      for (const templateSet of dto.data.templates) {
        const createdSet = await tx.lawfirmTemplateSet.create({
          data: {
            workspaceId: dto.workspaceId,
            createdBy: userId,
            name: templateSet.name,
            status: templateSet.status,
            visibility: 'private',
          },
        });
        for (const [docIndex, document] of templateSet.documents.entries()) {
          const storageKey = await this.r2Helper.uploadBuffer({
            workspaceId: dto.workspaceId,
            userId,
            fileName: document.fileName,
            buffer: Buffer.from(document.plainText || 'imported'),
            mimeType:
              document.fileType === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            category: 'template',
          });
          await tx.lawfirmTemplateDocument.create({
            data: {
              templateSetId: createdSet.id,
              fileName: document.fileName,
              fileType: document.fileType,
              status: document.status,
              storageKey,
              plainText: document.plainText,
              previewHtml: document.previewHtml ?? null,
              sortOrder: docIndex,
              fields: {
                create: document.fields.map((field, fieldIndex) => ({
                  label: field.label,
                  placeholder: field.placeholder,
                  mappedKey: field.mappedKey,
                  source: field.source,
                  count: field.count,
                  sortOrder: fieldIndex,
                })),
              },
            },
          });
        }
      }
    });
    await this.auditService.logAudit({
      workspaceId: dto.workspaceId,
      actorId: userId,
      action: 'profile.import_local',
      entityType: 'lawfirm_workspace',
      entityId: dto.workspaceId,
      metadata: {
        hash: dto.hash,
        profileCount: dto.data.profiles.length,
        templateSetCount: dto.data.templates.length,
      },
    });
    const profiles = await this.prisma.lawfirmClientProfile.findMany({
      where: { workspaceId: dto.workspaceId },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    return {
      already_imported: false,
      profiles: profiles.map(serializeProfile),
      template_sets_count: dto.data.templates.length,
    };
  }
}
