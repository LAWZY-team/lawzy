import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';

const AI_CREDITS_RENEWAL_DAYS = 30;
const AI_CREDITS_LIMIT_MVP = 100;

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  /** Deduct 1 AI credit for contract generation. Throws if no credit remaining. */
  async deductCredit(userId: string): Promise<{ ok: true; remaining: number }> {
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

    const remaining = uc.aiCreditsLimit - uc.aiCreditsUsed;
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
}
