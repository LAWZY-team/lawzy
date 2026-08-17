import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { fixUploadFilename } from '../../common/fix-upload-filename';
import { LawfirmAuditService } from './lawfirm-audit.service';
import { LawfirmR2Helper } from './utils/lawfirm-r2.helper';
import { batchFillAndZip, DOCX_MIME } from './utils/lawfirm-docx-filler';
import { validateLawfirmFillPreflight } from './utils/lawfirm-fill-preflight';
import { serializeFillRun } from './utils/lawfirm-serializer';
import { CreateFillRunDto } from './dto/fill-run.dto';
import { normalizePersistedLawfirmFieldKey } from './lawfirm-field-taxonomy';

@Injectable()
export class LawfirmFillRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly auditService: LawfirmAuditService,
    private readonly r2Helper: LawfirmR2Helper,
  ) {}

  async create(userId: string, dto: CreateFillRunDto) {
    await this.workspaceAccess.requireMembership(dto.workspaceId, userId);
    if (dto.idempotencyKey) {
      const existingRuns = await this.prisma.lawfirmFillRun.findMany({
        where: {
          workspaceId: dto.workspaceId,
          profileId: dto.profileId,
          templateSetId: dto.templateSetId,
          createdBy: userId,
        },
        include: { outputs: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const existing = existingRuns.find((run) => {
        const summary = run.matchSummary as { idempotencyKey?: string } | null;
        return summary?.idempotencyKey === dto.idempotencyKey;
      });
      if (existing) return serializeFillRun(existing);
    }
    const [profile, templateSet] = await Promise.all([
      this.prisma.lawfirmClientProfile.findUnique({
        where: { id: dto.profileId },
        include: {
          fields: true,
          entities: {
            include: {
              values: {
                include: { fieldDefinition: { select: { canonicalKey: true } } },
              },
            },
          },
        },
      }),
      this.prisma.lawfirmTemplateSet.findUnique({
        where: { id: dto.templateSetId },
        include: {
          documents: {
            include: {
              fields: { orderBy: { sortOrder: 'asc' } },
              slots: {
                select: {
                  legacyTemplateFieldId: true,
                  templateSetField: {
                    select: {
                      defaultEntitySelector: true,
                      defaultFieldDefinition: {
                        select: { canonicalKey: true },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
          setFields: {
            select: {
              id: true,
              normalizedSlot: true,
              defaultEntitySelector: true,
              defaultFieldDefinitionId: true,
              mappingStatus: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
    ]);
    if (!profile || profile.workspaceId !== dto.workspaceId) {
      throw new NotFoundException('Profile not found');
    }
    if (!templateSet) {
      throw new NotFoundException('Template set not found');
    }
    if (
      templateSet.workspaceId !== dto.workspaceId &&
      templateSet.visibility !== 'public'
    ) {
      throw new NotFoundException('Template set not found');
    }
    const preflightIssues = validateLawfirmFillPreflight({
      profileFields: profile.fields,
      documents: templateSet.documents,
    });
    if (preflightIssues.length > 0) {
      throw new BadRequestException({
        message:
          'Template/profile mapping conflicts must be resolved before fill',
        issues: preflightIssues,
      });
    }
    const docxDocuments = templateSet.documents.filter(
      (doc) => doc.fileType === 'docx' || doc.fileType === 'doc',
    );
    if (docxDocuments.length === 0) {
      throw new BadRequestException(
        'Bộ mẫu hồ sơ chưa có tài liệu DOCX hoặc DOC nào để điền dữ liệu',
      );
    }
    const profileFieldMap = new Map(
      profile.fields.map(
        (field) =>
          [normalizePersistedLawfirmFieldKey(field.fieldKey), field] as const,
      ),
    );
    const rootEntity =
      profile.entities.find(
        (entity) => entity.role === 'primary' && entity.ordinal === 0,
      ) ?? profile.entities[0];
    const profileValueByEntityAndKey = new Map(
      profile.entities.flatMap((entity) =>
        entity.values.map(
          (value) =>
            [
              `${entity.id}::${normalizePersistedLawfirmFieldKey(
                value.fieldDefinition.canonicalKey,
              )}`,
              value.rawValue,
            ] as const,
        ),
      ),
    );
    const profileSnapshot = {
      profileId: profile.id,
      revision: profile.revision,
      fields: profile.fields.map((field) => ({
        fieldKey: field.fieldKey,
        value: field.value,
        sortOrder: field.sortOrder,
      })),
      entities: profile.entities.map((entity) => ({
        entityType: entity.entityType,
        role: entity.role,
        ordinal: entity.ordinal,
        displayName: entity.displayName,
        values: entity.values.map((value) => ({
          canonicalKey: value.fieldDefinition.canonicalKey,
          rawValue: value.rawValue,
          valueIndex: value.valueIndex,
          revision: value.revision,
        })),
      })),
    };
    const templateSnapshot = {
      templateSetId: templateSet.id,
      revision: templateSet.revision,
      documents: templateSet.documents.map((document) => ({
        id: document.id,
        fileName: document.fileName,
        sortOrder: document.sortOrder,
      })),
    };
    const mappingSnapshot = templateSet.setFields.map((field) => ({
      normalizedSlot: field.normalizedSlot,
      fieldDefinitionId: field.defaultFieldDefinitionId,
      entitySelector: field.defaultEntitySelector,
      mappingStatus: field.mappingStatus,
    }));
    const fillRun = await this.prisma.lawfirmFillRun.create({
      data: {
        workspaceId: dto.workspaceId,
        profileId: dto.profileId,
        templateSetId: dto.templateSetId,
        createdBy: userId,
        status: 'processing',
        profileSnapshot: profileSnapshot as Prisma.InputJsonValue,
        templateSnapshot: templateSnapshot as Prisma.InputJsonValue,
        mappingSnapshot: mappingSnapshot as Prisma.InputJsonValue,
      },
    });
    try {
      const files: Array<{
        name: string;
        buffer: Buffer;
        replacements: Array<{ value: string; aliases: string[] }>;
      }> = [];
      for (const document of docxDocuments) {
        const buffer = await this.r2Helper.downloadBuffer(document.storageKey);
        const bindingByLegacyFieldId = new Map(
          document.slots
            .filter((slot) => Boolean(slot.legacyTemplateFieldId))
            .map((slot) => [slot.legacyTemplateFieldId!, slot.templateSetField]),
        );
        const replacements = document.fields
          .map((field) => {
            const binding = bindingByLegacyFieldId.get(field.id);
            const canonicalKey =
              binding?.defaultFieldDefinition?.canonicalKey ?? field.mappedKey;
            const entitySelector = binding?.defaultEntitySelector;
            const entity =
              entitySelector && entitySelector !== 'root'
                ? profile.entities.find((item) => item.id === entitySelector)
                : rootEntity;
            const entityValue =
              entity && canonicalKey
                ? profileValueByEntityAndKey.get(
                    `${entity.id}::${normalizePersistedLawfirmFieldKey(
                      canonicalKey,
                    )}`,
                  )
                : undefined;
            const legacyProfileField = field.mappedKey
              ? profileFieldMap.get(
                  normalizePersistedLawfirmFieldKey(field.mappedKey),
                )
              : undefined;
            const value = entityValue ?? legacyProfileField?.value;
            if (!value || value.trim().length === 0) {
              return null;
            }
            return {
              value,
              aliases: [field.placeholder],
            };
          })
          .filter(
            (
              replacement,
            ): replacement is { value: string; aliases: string[] } =>
              Boolean(replacement),
          );
        files.push({
          name: fixUploadFilename(document.fileName),
          buffer,
          replacements,
        });
      }
      const batchResult = await batchFillAndZip(files, []);
      const outputRecords: Array<{
        fileName: string;
        storageKey: string;
        fileType: string;
        fillCount: number;
        state: string;
      }> = [];
      for (const result of batchResult.results) {
        const outputName = fixUploadFilename(result.name);
        if (!result.buffer) {
          outputRecords.push({
            fileName: outputName,
            storageKey: '',
            fileType: 'docx',
            fillCount: 0,
            state: 'error',
          });
          continue;
        }
        const storageKey = await this.r2Helper.uploadBuffer({
          workspaceId: dto.workspaceId,
          userId,
          fileName: `DA_DIEN_${outputName}`,
          buffer: result.buffer,
          mimeType: DOCX_MIME,
          category: 'export_output',
        });
        outputRecords.push({
          fileName: `DA_DIEN_${outputName}`,
          storageKey,
          fileType: 'docx',
          fillCount: result.count,
          state: result.count > 0 ? 'success' : 'no_match',
        });
      }
      const zipStorageKey = await this.r2Helper.uploadBuffer({
        workspaceId: dto.workspaceId,
        userId,
        fileName: `ho_so_da_dien_${fillRun.id}.zip`,
        buffer: batchResult.zipBuffer,
        mimeType: 'application/zip',
        category: 'export_output',
      });
      const completed = await this.prisma.$transaction(async (tx) => {
        await tx.lawfirmFillOutput.createMany({
          data: outputRecords.map((output) => ({
            fillRunId: fillRun.id,
            fileName: output.fileName,
            storageKey: output.storageKey,
            fileType: output.fileType,
            fillCount: output.fillCount,
            state: output.state,
          })),
        });
        return tx.lawfirmFillRun.update({
          where: { id: fillRun.id },
          data: {
            status: 'completed',
            zipStorageKey,
            matchSummary: {
              totalReplacements: batchResult.totalReplacements,
              documentCount: docxDocuments.length,
              idempotencyKey: dto.idempotencyKey ?? null,
            } as unknown as Prisma.InputJsonValue,
          },
          include: { outputs: true },
        });
      });
      await this.auditService.logAudit({
        workspaceId: dto.workspaceId,
        actorId: userId,
        action: 'fill_run.create',
        entityType: 'lawfirm_fill_run',
        entityId: fillRun.id,
      });
      return serializeFillRun(completed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fill run failed';
      const failed = await this.prisma.lawfirmFillRun.update({
        where: { id: fillRun.id },
        data: { status: 'failed', errorMessage: message },
        include: { outputs: true },
      });
      return serializeFillRun(failed);
    }
  }

  async list(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const runs = await this.prisma.lawfirmFillRun.findMany({
      where: { workspaceId },
      include: { outputs: true },
      orderBy: { createdAt: 'desc' },
    });
    return runs.map(serializeFillRun);
  }

  async getById(userId: string, id: string) {
    const run = await this.prisma.lawfirmFillRun.findUnique({
      where: { id },
      include: { outputs: true },
    });
    if (!run) throw new NotFoundException('Fill run not found');
    await this.workspaceAccess.requireMembership(run.workspaceId, userId);
    return serializeFillRun(run);
  }

  async download(userId: string, id: string): Promise<StreamableFile> {
    const run = await this.prisma.lawfirmFillRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Fill run not found');
    await this.workspaceAccess.requireMembership(run.workspaceId, userId);
    if (!run.zipStorageKey) {
      throw new BadRequestException('Fill run has no downloadable zip');
    }
    const buffer = await this.r2Helper.downloadBuffer(run.zipStorageKey);
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="ho_so_da_dien_${id}.zip"`,
    });
  }
}
