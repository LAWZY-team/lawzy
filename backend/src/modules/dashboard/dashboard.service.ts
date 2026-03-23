import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';

const AI_CREDITS_RENEWAL_DAYS = 30;
const AI_CREDITS_LIMIT_MVP = 100;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

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
      totalSources: 0,
      storageUsed: 0,
      aiCreditsUsed: 0,
      aiCreditsLimit: AI_CREDITS_LIMIT_MVP,
      aiCreditsRemaining: AI_CREDITS_LIMIT_MVP,
      nextRenewalAt: null as string | null,
      aiCreditsRenewalDays: AI_CREDITS_RENEWAL_DAYS,
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
      totalSources,
      fileSizes,
      sourceSizes,
      creditInfo,
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
      this.getUserCreditInfo(userId),
    ]);

    const storageUsed =
      (fileSizes._sum.size ?? 0) + (sourceSizes._sum.size ?? 0);

    return {
      totalDocuments,
      draftDocuments,
      reviewDocuments,
      completedDocuments,
      totalFiles,
      totalSources,
      storageUsed,
      aiCreditsUsed: creditInfo.aiCreditsUsed,
      aiCreditsLimit: creditInfo.aiCreditsLimit,
      aiCreditsRemaining: creditInfo.aiCreditsRemaining,
      nextRenewalAt: creditInfo.nextRenewalAt,
      aiCreditsRenewalDays: AI_CREDITS_RENEWAL_DAYS,
    };
  }

  private async getUserCreditInfo(userId: string): Promise<{
    aiCreditsUsed: number;
    aiCreditsLimit: number;
    aiCreditsRemaining: number;
    nextRenewalAt: string | null;
  }> {
    let uc = await this.prisma.userCredit.findUnique({
      where: { userId },
    });

    const now = new Date();
    if (!uc) {
      uc = await this.prisma.userCredit.create({
        data: {
          userId,
          aiCreditsUsed: 0,
          aiCreditsLimit: AI_CREDITS_LIMIT_MVP,
          renewalStartedAt: now,
        },
      });
    } else {
      const nextRenewal = new Date(uc.renewalStartedAt);
      nextRenewal.setDate(nextRenewal.getDate() + AI_CREDITS_RENEWAL_DAYS);
      if (now >= nextRenewal) {
        uc = await this.prisma.userCredit.update({
          where: { userId },
          data: { aiCreditsUsed: 0, renewalStartedAt: now },
        });
      }
    }

    const nextRenewal = new Date(uc.renewalStartedAt);
    nextRenewal.setDate(nextRenewal.getDate() + AI_CREDITS_RENEWAL_DAYS);
    const remaining = Math.max(0, uc.aiCreditsLimit - uc.aiCreditsUsed);

    return {
      aiCreditsUsed: uc.aiCreditsUsed,
      aiCreditsLimit: uc.aiCreditsLimit,
      aiCreditsRemaining: remaining,
      nextRenewalAt: nextRenewal.toISOString(),
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
