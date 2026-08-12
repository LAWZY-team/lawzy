import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

export interface LawfirmAiUsageRecord {
  workspaceId: string;
  actorId: string;
  templateSetId?: string;
  mappingJobId?: string;
  taskType: string;
  taskLabel: string;
  operationKey: string;
  modelName: string;
  status: 'completed' | 'failed' | 'cached';
  promptTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  thinkingTokens?: number;
  toolTokens?: number;
  totalTokens?: number;
  retryCount?: number;
  latencyMs?: number;
  inputItems?: number;
  resultItems?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LawfirmAiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async record(input: LawfirmAiUsageRecord): Promise<void> {
    const data = {
      actorId: input.actorId,
      templateSetId: input.templateSetId ?? null,
      mappingJobId: input.mappingJobId ?? null,
      taskType: input.taskType,
      taskLabel: input.taskLabel,
      modelName: input.modelName,
      status: input.status,
      promptTokens: input.promptTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      cachedTokens: input.cachedTokens ?? 0,
      thinkingTokens: input.thinkingTokens ?? 0,
      toolTokens: input.toolTokens ?? 0,
      totalTokens: input.totalTokens ?? 0,
      retryCount: input.retryCount ?? 0,
      latencyMs: input.latencyMs ?? 0,
      inputItems: input.inputItems ?? 0,
      resultItems: input.resultItems ?? 0,
      errorCode: input.errorCode ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
    await this.prisma.lawfirmAiUsageEvent.upsert({
      where: {
        workspaceId_operationKey: {
          workspaceId: input.workspaceId,
          operationKey: input.operationKey,
        },
      },
      create: {
        workspaceId: input.workspaceId,
        operationKey: input.operationKey,
        ...data,
      },
      update: data,
    });
  }

  async report(userId: string, workspaceId: string, days = 30) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const normalizedDays = Math.max(1, Math.min(90, Math.floor(days) || 30));
    const since = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);
    const where = { workspaceId, createdAt: { gte: since } };
    const [totals, actualCalls, correctionEvents, grouped, recent] =
      await Promise.all([
        this.prisma.lawfirmAiUsageEvent.aggregate({
          where,
          _sum: {
            promptTokens: true,
            outputTokens: true,
            cachedTokens: true,
            thinkingTokens: true,
            toolTokens: true,
            totalTokens: true,
            retryCount: true,
            latencyMs: true,
            inputItems: true,
            resultItems: true,
          },
          _count: { _all: true },
        }),
        this.prisma.lawfirmAiUsageEvent.count({
          where: { ...where, status: { not: 'cached' } },
        }),
        this.prisma.lawfirmAuditEvent.findMany({
          where: {
            workspaceId,
            action: 'template_mapping.corrected',
            createdAt: { gte: since },
          },
          select: { metadata: true },
        }),
        this.prisma.lawfirmAiUsageEvent.groupBy({
          by: ['taskType'],
          where,
          _sum: {
            promptTokens: true,
            outputTokens: true,
            cachedTokens: true,
            thinkingTokens: true,
            totalTokens: true,
          },
          _count: { _all: true },
        }),
        this.prisma.lawfirmAiUsageEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            taskType: true,
            taskLabel: true,
            modelName: true,
            status: true,
            promptTokens: true,
            outputTokens: true,
            cachedTokens: true,
            thinkingTokens: true,
            toolTokens: true,
            totalTokens: true,
            retryCount: true,
            latencyMs: true,
            inputItems: true,
            resultItems: true,
            createdAt: true,
            templateSet: { select: { id: true, name: true } },
          },
        }),
      ]);
    return {
      workspace_id: workspaceId,
      period_days: normalizedDays,
      since: since.toISOString(),
      totals: {
        calls: actualCalls,
        prompt_tokens: totals._sum.promptTokens ?? 0,
        output_tokens: totals._sum.outputTokens ?? 0,
        cached_tokens: totals._sum.cachedTokens ?? 0,
        thinking_tokens: totals._sum.thinkingTokens ?? 0,
        tool_tokens: totals._sum.toolTokens ?? 0,
        total_tokens: totals._sum.totalTokens ?? 0,
        retries: totals._sum.retryCount ?? 0,
        latency_ms: totals._sum.latencyMs ?? 0,
        input_items: totals._sum.inputItems ?? 0,
        result_items: totals._sum.resultItems ?? 0,
        correction_count: correctionEvents.reduce((total, event) => {
          const metadata = event.metadata as {
            correctionCount?: number;
          } | null;
          return total + (metadata?.correctionCount ?? 0);
        }, 0),
      },
      by_task: grouped.map((item) => ({
        task_type: item.taskType,
        calls: item._count._all,
        prompt_tokens: item._sum.promptTokens ?? 0,
        output_tokens: item._sum.outputTokens ?? 0,
        cached_tokens: item._sum.cachedTokens ?? 0,
        thinking_tokens: item._sum.thinkingTokens ?? 0,
        total_tokens: item._sum.totalTokens ?? 0,
      })),
      recent: recent.map((item) => ({
        id: item.id,
        task_type: item.taskType,
        task_label: item.taskLabel,
        model_name: item.modelName,
        status: item.status,
        prompt_tokens: item.promptTokens,
        output_tokens: item.outputTokens,
        cached_tokens: item.cachedTokens,
        thinking_tokens: item.thinkingTokens,
        tool_tokens: item.toolTokens,
        total_tokens: item.totalTokens,
        retries: item.retryCount,
        latency_ms: item.latencyMs,
        input_items: item.inputItems,
        result_items: item.resultItems,
        template_set: item.templateSet,
        created_at: item.createdAt.toISOString(),
      })),
    };
  }
}
