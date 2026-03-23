import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';

export interface QuotaLimits {
  dailyAiQuota?: number | 'unlimited';
  storageBytes?: number;
  workspaceMembers?: number | 'unlimited';
  workspacesPerUser?: number | 'unlimited';
  templates?: number | 'unlimited';
  aiAssistant?: boolean;
  monthlyEquivalentSlug?: string;
  pricePerSeat?: number;
  minSeats?: number;
  maxSeats?: number;
}

export interface PlanCreateInput {
  slug: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price?: number;
  billingCycle?: string;
  sortOrder?: number;
  isActive?: boolean;
  isHighlighted?: boolean;
  contactSales?: boolean;
  quotaLimits?: QuotaLimits;
}

export interface PlanUpdateInput extends Partial<PlanCreateInput> {}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic() {
    return this.prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllAdmin() {
    const plans = await this.prisma.membershipPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { payments: true } } },
    });
    const grouped = await this.prisma.workspace.groupBy({
      by: ['plan'],
      where: { plan: { not: '' } },
      _count: { id: true },
    });
    const countBySlug = new Map(
      grouped.map((g) => [g.plan, g._count.id]),
    );
    return plans.map((p) => ({
      ...p,
      workspaceCount: countBySlug.get(p.slug) ?? 0,
    }));
  }

  async findById(id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findBySlug(slug: string, includeInactive = false) {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: includeInactive ? { slug } : { slug, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findDefaultPlan() {
    const plan = await this.prisma.membershipPlan.findFirst({
      where: { price: 0 },
      orderBy: { sortOrder: 'asc' },
    });
    if (plan) return plan;
    return this.prisma.membershipPlan.findFirst({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: PlanCreateInput) {
    return this.prisma.membershipPlan.create({
      data: {
        slug: data.slug,
        name: data.name,
        nameEn: data.nameEn,
        description: data.description,
        descriptionEn: data.descriptionEn,
        price: data.price ?? 0,
        billingCycle: data.billingCycle ?? 'monthly',
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        isHighlighted: data.isHighlighted ?? false,
        contactSales: data.contactSales ?? false,
        quotaLimits: (data.quotaLimits as object) ?? undefined,
      },
    });
  }

  async update(id: string, data: PlanUpdateInput) {
    await this.findById(id);
    return this.prisma.membershipPlan.update({
      where: { id },
      data: {
        ...(data.slug != null && { slug: data.slug }),
        ...(data.name != null && { name: data.name }),
        ...(data.nameEn != null && { nameEn: data.nameEn }),
        ...(data.description != null && { description: data.description }),
        ...(data.descriptionEn != null && {
          descriptionEn: data.descriptionEn,
        }),
        ...(data.price != null && { price: data.price }),
        ...(data.billingCycle != null && { billingCycle: data.billingCycle }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
        ...(data.isActive != null && { isActive: data.isActive }),
        ...(data.isHighlighted != null && {
          isHighlighted: data.isHighlighted,
        }),
        ...(data.contactSales != null && { contactSales: data.contactSales }),
        ...(data.quotaLimits != null && {
          quotaLimits: data.quotaLimits as object,
        }),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.membershipPlan.delete({ where: { id } });
  }

  async findPlanWorkspaces(planId: string) {
    const plan = await this.findById(planId);
    const workspaces = await this.prisma.workspace.findMany({
      where: { plan: plan.slug },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
    });
    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      membersCount: w._count.members,
    }));
  }
}
