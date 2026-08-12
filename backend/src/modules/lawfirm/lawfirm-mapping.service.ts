import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, type LawfirmMappingJob } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { LawfirmGeminiMappingGateway } from './lawfirm-gemini-mapping.gateway';
import { LawfirmTemplateSetIndexService } from './lawfirm-template-set-index.service';

@Injectable()
export class LawfirmMappingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly gateway: LawfirmGeminiMappingGateway,
    private readonly templateSetIndex: LawfirmTemplateSetIndexService,
  ) {}

  async getTemplateSetSummary(userId: string, templateSetId: string) {
    const templateSet = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id: templateSetId },
      select: { id: true, workspaceId: true },
    });
    if (!templateSet) throw new NotFoundException('Template set not found');
    await this.workspaceAccess.requireMembership(
      templateSet.workspaceId,
      userId,
    );

    let fields = await this.prisma.lawfirmTemplateSetField.findMany({
      where: { templateSetId },
      select: {
        mappingStatus: true,
        _count: { select: { documentSlots: true } },
      },
    });
    if (fields.length === 0) {
      const documentCount = await this.prisma.lawfirmTemplateDocument.count({
        where: { templateSetId },
      });
      if (documentCount > 0) {
        await this.templateSetIndex.rebuild(templateSetId);
        fields = await this.prisma.lawfirmTemplateSetField.findMany({
          where: { templateSetId },
          select: {
            mappingStatus: true,
            _count: { select: { documentSlots: true } },
          },
        });
      }
    }

    const unresolvedStatuses = new Set([
      'unmapped',
      'needs_review',
      'conflict',
    ]);
    const unresolvedFields = fields.filter((field) =>
      unresolvedStatuses.has(field.mappingStatus),
    ).length;
    const latestJob = await this.prisma.lawfirmMappingJob.findFirst({
      where: { templateSetId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        result: true,
        errorMessage: true,
        updatedAt: true,
      },
    });

    return {
      template_set_id: templateSetId,
      total_unique_fields: fields.length,
      mapped_fields: fields.length - unresolvedFields,
      unresolved_fields: unresolvedFields,
      needs_review_fields: fields.filter(
        (field) => field.mappingStatus === 'needs_review',
      ).length,
      conflict_fields: fields.filter(
        (field) => field.mappingStatus === 'conflict',
      ).length,
      occurrences: fields.reduce(
        (total, field) => total + field._count.documentSlots,
        0,
      ),
      estimated_gemini_calls:
        unresolvedFields === 0
          ? 0
          : Math.min(3, Math.ceil(unresolvedFields / 20)),
      latest_job: latestJob
        ? {
            job_id: latestJob.id,
            status: latestJob.status,
            result: latestJob.result,
            error_message: latestJob.errorMessage,
            updated_at: latestJob.updatedAt.toISOString(),
          }
        : null,
    };
  }

  async resolveTemplateSet(userId: string, templateSetId: string) {
    const templateSet = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id: templateSetId },
      select: { id: true, workspaceId: true, revision: true },
    });
    if (!templateSet) throw new NotFoundException('Template set not found');
    await this.workspaceAccess.requireMembership(
      templateSet.workspaceId,
      userId,
    );
    const fieldCount = await this.prisma.lawfirmTemplateSetField.count({
      where: { templateSetId },
    });
    if (fieldCount === 0) await this.templateSetIndex.rebuild(templateSetId);
    const allFields = await this.prisma.lawfirmTemplateSetField.findMany({
      where: { templateSetId },
      select: {
        id: true,
        normalizedSlot: true,
        mappingStatus: true,
        contextFingerprint: true,
      },
      orderBy: { normalizedSlot: 'asc' },
    });
    const fields = allFields.filter((field) =>
      ['unmapped', 'needs_review', 'conflict'].includes(field.mappingStatus),
    );
    const inputFingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          revision: templateSet.revision,
          fields: allFields.map((field) => ({
            id: field.id,
            slot: field.normalizedSlot,
            context: field.contextFingerprint,
          })),
        }),
      )
      .digest('hex');
    const idempotencyKey = `mapping:${templateSetId}:${templateSet.revision}:${inputFingerprint}`;
    const existing = await this.prisma.lawfirmMappingJob.findUnique({
      where: { idempotencyKey },
    });
    let job: LawfirmMappingJob;
    if (existing) {
      const stale =
        existing.status === 'processing' &&
        existing.startedAt &&
        existing.startedAt.getTime() < Date.now() - 2 * 60 * 1000;
      if (!stale) return this.serialize(existing, true);
      const reclaimed = await this.prisma.lawfirmMappingJob.updateMany({
        where: {
          id: existing.id,
          status: 'processing',
          startedAt: existing.startedAt,
        },
        data: { startedAt: new Date(), errorMessage: null },
      });
      if (reclaimed.count !== 1) {
        const current = await this.prisma.lawfirmMappingJob.findUniqueOrThrow({
          where: { id: existing.id },
        });
        return this.serialize(current, true);
      }
      job = await this.prisma.lawfirmMappingJob.findUniqueOrThrow({
        where: { id: existing.id },
      });
      return this.execute(job, fields, templateSet, userId, true);
    }
    try {
      job = await this.prisma.lawfirmMappingJob.create({
        data: {
          workspaceId: templateSet.workspaceId,
          templateSetId,
          createdBy: userId,
          templateSetRevision: templateSet.revision,
          inputFingerprint,
          idempotencyKey,
          status: 'processing',
          startedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      const raced = await this.prisma.lawfirmMappingJob.findUnique({
        where: { idempotencyKey },
      });
      if (raced) return this.serialize(raced, true);
      throw error;
    }
    return this.execute(job, fields, templateSet, userId, false);
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.prisma.lawfirmMappingJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Mapping job not found');
    await this.workspaceAccess.requireMembership(job.workspaceId, userId);
    return this.serialize(job, true);
  }

  private async execute(
    job: LawfirmMappingJob,
    fields: Array<{ id: string }>,
    templateSet: { id: string; workspaceId: string; revision: number },
    userId: string,
    cached: boolean,
  ) {
    try {
      const result = fields.length
        ? await this.gateway.resolve({
            workspaceId: templateSet.workspaceId,
            actorId: userId,
            templateSetId: templateSet.id,
            mappingJobId: job.id,
            templateSetRevision: templateSet.revision,
          })
        : {
            total_unique_slots: 0,
            cache_hits: 0,
            gemini_calls: 0,
            mapped: 0,
            needs_review: 0,
            decisions: [],
          };
      const completed = await this.prisma.lawfirmMappingJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: result as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
      return this.serialize(completed, cached);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.prisma.lawfirmMappingJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      return this.serialize(failed, cached);
    }
  }

  async resolveDocument(userId: string, documentId: string) {
    const document = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: documentId },
      select: { templateSetId: true },
    });
    if (!document) throw new NotFoundException('Template document not found');
    return this.resolveTemplateSet(userId, document.templateSetId);
  }

  private serialize(
    job: {
      id: string;
      templateSetId: string;
      status: string;
      result: Prisma.JsonValue | null;
      errorMessage: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    cached: boolean,
  ) {
    return {
      job_id: job.id,
      template_set_id: job.templateSetId,
      status: job.status,
      cached,
      result: job.result,
      error_message: job.errorMessage,
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString(),
    };
  }
}
