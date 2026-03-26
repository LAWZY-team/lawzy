import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';

const AI_CREDITS_RENEWAL_DAYS = 30;
const AI_CREDITS_LIMIT_MVP = 100;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  private async getWorkspaceIds(
    userId: string,
    scopeWorkspaceId?: string | null,
  ): Promise<string[]> {
    const memberOf = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const ids = memberOf.map((m) => m.workspaceId);
    if (scopeWorkspaceId && ids.includes(scopeWorkspaceId)) return [scopeWorkspaceId];
    return ids;
  }

  async getOverview(userId: string, workspaceId?: string | null) {
    const workspaceIds = await this.getWorkspaceIds(userId, workspaceId);
    const baseEmpty = {
      totalDocuments: 0,
      draftDocuments: 0,
      reviewDocuments: 0,
      completedDocuments: 0,
      totalFiles: 0,
    };
    if (workspaceIds.length === 0) {
      return baseEmpty;
    }

    const [
      totalDocuments,
      draftDocuments,
      reviewDocuments,
      completedDocuments,
      totalFiles,
    ] = await Promise.all([
      this.prisma.document.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      this.prisma.document.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: 'draft',
        },
      }),
      this.prisma.document.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: 'review',
        },
      }),
      this.prisma.document.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: 'completed',
        },
      }),
      this.prisma.file.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
    ]);

    return {
      totalDocuments,
      draftDocuments,
      reviewDocuments,
      completedDocuments,
      totalFiles,
    };
  }

  async getQuotaOverview(userId: string, workspaceId?: string | null) {
    const workspaceIds = await this.getWorkspaceIds(userId, workspaceId);
    if (workspaceIds.length === 0) {
      return {
        totalFiles: 0,
        totalSources: 0,
        storageUsed: 0,
        storageBreakdown: {
          input_upload: { bytes: 0, count: 0 },
          input_source: { bytes: 0, count: 0 },
          template: { bytes: 0, count: 0 },
          export_output: { bytes: 0, count: 0 },
        },
        aiCreditsUsed: 0,
        aiCreditsLimit: AI_CREDITS_LIMIT_MVP,
        aiCreditsRemaining: AI_CREDITS_LIMIT_MVP,
        nextRenewalAt: null as string | null,
        aiCreditsRenewalDays: AI_CREDITS_RENEWAL_DAYS,
      };
    }

    const [
      totalFiles,
      totalSources,
      fileSizes,
      sourceSizes,
      fileGrouped,
      creditInfo,
    ] = await Promise.all([
      this.prisma.file.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      this.prisma.source.count({
        where: { workspaceId: { in: workspaceIds } },
      }),
      this.prisma.file.aggregate({
        where: { workspaceId: { in: workspaceIds } },
        _sum: { size: true },
      }),
      this.prisma.source.aggregate({
        where: { workspaceId: { in: workspaceIds } },
        _sum: { size: true },
      }),
      this.prisma.file.groupBy({
        by: ['category'],
        where: { workspaceId: { in: workspaceIds } },
        _sum: { size: true },
        _count: { _all: true },
      }),
      this.getUserCreditInfo(userId, workspaceIds[0] ?? null),
    ]);

    const storageUsed =
      (fileSizes._sum.size ?? 0) + (sourceSizes._sum.size ?? 0);

    const byCategory = new Map<
      string,
      { bytes: number; count: number }
    >();
    for (const g of fileGrouped) {
      byCategory.set(String((g as any).category), {
        bytes: Number((g as any)._sum?.size ?? 0),
        count: Number((g as any)._count?._all ?? 0),
      });
    }

    const inputSourceBytes = Number(sourceSizes._sum.size ?? 0);
    const storageBreakdown = {
      input_upload: byCategory.get('input_upload') ?? { bytes: 0, count: 0 },
      input_source: { bytes: inputSourceBytes, count: totalSources },
      template: byCategory.get('template') ?? { bytes: 0, count: 0 },
      export_output: byCategory.get('export_output') ?? { bytes: 0, count: 0 },
    };

    return {
      totalFiles,
      totalSources,
      storageUsed,
      storageBreakdown,
      ...creditInfo,
    };
  }

  private async getEffectiveAiLimit(workspaceId: string | null): Promise<number | null> {
    if (!workspaceId) return AI_CREDITS_LIMIT_MVP;
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    if (!workspace) return AI_CREDITS_LIMIT_MVP;
    const plan = await this.plansService.findBySlug(workspace.plan).catch(() => null);
    const ql = (plan?.quotaLimits ?? {}) as { dailyAiQuota?: number | 'unlimited' };
    const quota = ql.dailyAiQuota;
    if (quota === 'unlimited') return null;
    if (typeof quota === 'number') return quota;
    return AI_CREDITS_LIMIT_MVP;
  }

  private async getUserCreditInfo(
    userId: string,
    workspaceId: string | null,
  ): Promise<{
    aiCreditsUsed: number;
    aiCreditsLimit: number;
    aiCreditsRemaining: number;
    nextRenewalAt: string | null;
    aiCreditsRenewalDays: number;
  }> {
    const limit = await this.getEffectiveAiLimit(workspaceId);
    const useDailyQuota = !!workspaceId && limit !== null && limit < AI_CREDITS_LIMIT_MVP;

    let uc = await this.prisma.userCredit.findUnique({
      where: { userId },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!uc) {
      uc = await this.prisma.userCredit.create({
        data: {
          userId,
          aiCreditsUsed: 0,
          aiCreditsLimit: AI_CREDITS_LIMIT_MVP,
          renewalStartedAt: now,
        },
      });
    } else if (!useDailyQuota) {
      const nextRenewal = new Date(uc.renewalStartedAt);
      nextRenewal.setDate(nextRenewal.getDate() + AI_CREDITS_RENEWAL_DAYS);
      if (now >= nextRenewal) {
        uc = await this.prisma.userCredit.update({
          where: { userId },
          data: { aiCreditsUsed: 0, renewalStartedAt: now },
        });
      }
    } else {
      const usedDate = uc.aiCreditsUsedDate ? new Date(uc.aiCreditsUsedDate) : null;
      const isNewDay = !usedDate || usedDate.getTime() !== today.getTime();
      if (isNewDay) {
        uc = await this.prisma.userCredit.update({
          where: { userId },
          data: {
            aiCreditsUsedToday: 0,
            aiCreditsUsedDate: today,
          },
        });
      }
    }

    if (limit === null) {
      return {
        aiCreditsUsed: 0,
        aiCreditsLimit: -1,
        aiCreditsRemaining: -1,
        nextRenewalAt: null,
        aiCreditsRenewalDays: 0,
      };
    }

    if (useDailyQuota) {
      const used = uc.aiCreditsUsedToday;
      const remaining = Math.max(0, limit - used);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        aiCreditsUsed: used,
        aiCreditsLimit: limit,
        aiCreditsRemaining: remaining,
        nextRenewalAt: endOfDay.toISOString(),
        aiCreditsRenewalDays: 1,
      };
    }

    const nextRenewal = new Date(uc.renewalStartedAt);
    nextRenewal.setDate(nextRenewal.getDate() + AI_CREDITS_RENEWAL_DAYS);
    const remaining = Math.max(0, uc.aiCreditsLimit - uc.aiCreditsUsed);

    return {
      aiCreditsUsed: uc.aiCreditsUsed,
      aiCreditsLimit: uc.aiCreditsLimit,
      aiCreditsRemaining: remaining,
      nextRenewalAt: nextRenewal.toISOString(),
      aiCreditsRenewalDays: AI_CREDITS_RENEWAL_DAYS,
    };
  }

  async getChartData(
    userId: string,
    period: 'week' | 'month' | 'year',
    workspaceId?: string | null,
  ): Promise<{ date: string; count: number }[]> {
    const workspaceIds = await this.getWorkspaceIds(userId, workspaceId);
    if (workspaceIds.length === 0) {
      return [];
    }

    const workspaceFilter =
      workspaceIds.length > 0
        ? Prisma.sql`workspace_id IN (${Prisma.join(
            workspaceIds.map((id) => Prisma.sql`${id}`),
          )})`
        : Prisma.sql`0 = 1`;

    if (period === 'week') {
      const result = await this.prisma.$queryRaw<
        { d: Date; count: bigint }[]
      >(Prisma.sql`
        SELECT DATE(created_at) as d, COUNT(*) as count
        FROM documents
        WHERE ${workspaceFilter}
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY d ASC
      `);
      return result.map((r) => ({
        date: (r.d as unknown as Date).toISOString().slice(0, 10),
        count: Number(r.count),
      }));
    }

    if (period === 'month') {
      const result = await this.prisma.$queryRaw<
        { d: Date; count: bigint }[]
      >(Prisma.sql`
        SELECT DATE(created_at) as d, COUNT(*) as count
        FROM documents
        WHERE ${workspaceFilter}
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY d ASC
      `);
      return result.map((r) => ({
        date: (r.d as unknown as Date).toISOString().slice(0, 10),
        count: Number(r.count),
      }));
    }

    if (period === 'year') {
      const result = await this.prisma.$queryRaw<
        { ym: string; count: bigint }[]
      >(Prisma.sql`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as count
        FROM documents
        WHERE ${workspaceFilter}
          AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY ym ASC
      `);
      return result.map((r) => ({
        date: r.ym,
        count: Number(r.count),
      }));
    }

    return [];
  }

  async getRecentDocuments(
    userId: string,
    limit: number,
    workspaceId?: string | null,
  ) {
    const workspaceIds = await this.getWorkspaceIds(userId, workspaceId);
    if (workspaceIds.length === 0) {
      return [];
    }

    return this.prisma.document.findMany({
      where: { workspaceId: { in: workspaceIds } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        type: true,
        updatedAt: true,
        workspace: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getWorkspaceBreakdown(userId: string) {
    const memberOf = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberOf.map((m) => m.workspaceId);
    if (workspaceIds.length === 0) {
      return [];
    }

    const counts = await this.prisma.document.groupBy({
      by: ['workspaceId'],
      where: { workspaceId: { in: workspaceIds } },
      _count: { id: true },
    });

    const workspaceMap = await this.prisma.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(workspaceMap.map((w) => [w.id, w.name]));

    return counts.map((c) => ({
      workspaceId: c.workspaceId,
      workspaceName: nameMap[c.workspaceId] ?? 'Unknown',
      documentCount: c._count.id,
    }));
  }
}
