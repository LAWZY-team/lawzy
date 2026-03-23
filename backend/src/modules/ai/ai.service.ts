import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';

const AI_CREDITS_RENEWAL_DAYS = 30;
const AI_CREDITS_LIMIT_MVP = 100;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  /** Resolve effective AI limit from workspace plan. Returns null for unlimited. */
  private async getEffectiveLimit(workspaceId: string | undefined): Promise<number | null> {
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

  /** Deduct 1 AI credit for contract generation. Throws if no credit remaining. */
  async deductCredit(userId: string, workspaceId?: string): Promise<{ ok: true; remaining: number }> {
    const limit = await this.getEffectiveLimit(workspaceId);

    if (limit === null) {
      return { ok: true, remaining: -1 };
    }

    const useDailyQuota = !!workspaceId && limit < AI_CREDITS_LIMIT_MVP;

    let uc = await this.prisma.userCredit.findUnique({ where: { userId } });
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
    }

    if (useDailyQuota) {
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
      const usedToday = uc.aiCreditsUsedToday;
      if (usedToday >= limit) {
        throw new ForbiddenException(
          `Daily AI quota reached (${limit} requests/day). Resets at midnight.`,
        );
      }
      const updated = await this.prisma.userCredit.update({
        where: { userId },
        data: {
          aiCreditsUsedToday: { increment: 1 },
          aiCreditsUsedDate: today,
        },
      });
      return {
        ok: true,
        remaining: Math.max(0, limit - updated.aiCreditsUsedToday),
      };
    }

    const nextRenewal = new Date(uc.renewalStartedAt);
    nextRenewal.setDate(nextRenewal.getDate() + AI_CREDITS_RENEWAL_DAYS);
    if (now >= nextRenewal) {
      uc = await this.prisma.userCredit.update({
        where: { userId },
        data: { aiCreditsUsed: 0, renewalStartedAt: now },
      });
    }

    const effectiveLimit = limit ?? AI_CREDITS_LIMIT_MVP;
    const remaining = effectiveLimit - uc.aiCreditsUsed;
    if (remaining <= 0) {
      throw new ForbiddenException('No AI credit remaining. Credit renews every 30 days.');
    }

    const updated = await this.prisma.userCredit.update({
      where: { userId },
      data: { aiCreditsUsed: { increment: 1 } },
    });

    return {
      ok: true,
      remaining: updated.aiCreditsLimit - updated.aiCreditsUsed,
    };
  }

  /** Refund 1 AI credit when generation fails. */
  async refundCredit(userId: string, workspaceId?: string): Promise<{ ok: true; remaining: number }> {
    const uc = await this.prisma.userCredit.findUnique({ where: { userId } });
    if (!uc) {
      return { ok: true, remaining: AI_CREDITS_LIMIT_MVP };
    }

    const limit = await this.getEffectiveLimit(workspaceId);
    const useDailyQuota = !!workspaceId && limit !== null && limit < AI_CREDITS_LIMIT_MVP;

    if (useDailyQuota && uc.aiCreditsUsedToday > 0) {
      const updated = await this.prisma.userCredit.update({
        where: { userId },
        data: { aiCreditsUsedToday: { decrement: 1 } },
      });
      return {
        ok: true,
        remaining: Math.max(0, (limit ?? 0) - updated.aiCreditsUsedToday),
      };
    }

    if (uc.aiCreditsUsed <= 0) {
      return {
        ok: true,
        remaining: uc.aiCreditsLimit - uc.aiCreditsUsed,
      };
    }
    const updated = await this.prisma.userCredit.update({
      where: { userId },
      data: { aiCreditsUsed: { decrement: 1 } },
    });
    return {
      ok: true,
      remaining: updated.aiCreditsLimit - updated.aiCreditsUsed,
    };
  }
}
