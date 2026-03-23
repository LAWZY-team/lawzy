import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { PayOSService } from './payos.service';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  async create(userId: string, workspaceId: string, planId: string) {
    const plan = await this.plansService.findById(planId);
    if (plan.contactSales || plan.price <= 0) {
      throw new BadRequestException('Plan requires contact sales or is free');
    }

    let wsId = workspaceId;
    if (!wsId) {
      const membership = await this.prisma.workspaceMember.findFirst({
        where: { userId },
        select: { workspaceId: true },
      });
      if (!membership) throw new BadRequestException('No workspace found');
      wsId = membership.workspaceId;
    }

    const orderCode = `lawzy${Date.now()}`;
    const result = await PayOSService.createPayment({
      orderCode,
      amount: plan.price,
      description: `Lawzy - Gói ${plan.name}`,
      items: [{ name: plan.name, quantity: 1, price: plan.price }],
      returnUrl: `${FRONTEND_URL}/payment/status/${orderCode}`,
      cancelUrl: `${FRONTEND_URL}/payment`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        workspaceId: wsId,
        planId: plan.id,
        amount: plan.price,
        orderCode,
        checkoutUrl: result.checkoutUrl,
        status: 'pending',
      },
      include: { plan: true },
    });

    return {
      orderId: orderCode,
      orderCode,
      checkoutUrl: result.checkoutUrl.startsWith('http')
        ? result.checkoutUrl
        : `${FRONTEND_URL}${result.checkoutUrl}`,
      status: 'pending',
      paymentId: payment.id,
    };
  }

  async getByOrderCode(orderCode: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderCode },
      include: { plan: true, user: { select: { name: true, email: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async listAdmin(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          plan: true,
          user: { select: { id: true, name: true, email: true } },
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async syncAndFulfill(
    orderCode: string,
    status: 'paid' | 'cancelled' | 'failed',
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderCode },
      include: { plan: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending') return payment;

    const paidAt = status === 'paid' ? new Date() : null;
    const plan = payment.plan;
    const quotaLimits = (plan.quotaLimits as object) || {};

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:
            status === 'paid'
              ? 'paid'
              : status === 'cancelled'
                ? 'cancelled'
                : 'failed',
          paidAt,
        },
      }),
      ...(status === 'paid'
        ? [
            this.prisma.workspace.update({
              where: { id: payment.workspaceId },
              data: {
                plan: plan.slug,
                quotaLimits,
              },
            }),
          ]
        : []),
    ]);

    return this.getByOrderCode(orderCode);
  }
}
