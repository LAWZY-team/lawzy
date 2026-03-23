import { randomBytes } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { API_ERROR_WORKSPACE_LIMIT_REACHED } from '../../common/plan.constants';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private async resolveWorkspaceLimit(userId: string): Promise<{
    count: number;
    limit: number | 'unlimited';
    canCreate: boolean;
  }> {
    const [memberships, defaultPlan, allPlans] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { select: { plan: true } } },
      }),
      this.plansService.findDefaultPlan(),
      this.plansService.findAllAdmin(),
    ]);

    const planBySlug = new Map(
      (allPlans ?? []).map((p) => [p.slug, p]),
    );
    const getPlan = (slug: string | null) =>
      slug ? planBySlug.get(slug) : null;

    const count = memberships.length;
    const hasPaidWorkspace = memberships.some((m) => {
      const plan = getPlan(m.workspace?.plan);
      return plan && plan.price > 0;
    });

    let limit: number | 'unlimited' = 1;
    if (hasPaidWorkspace) {
      const paidMembership = memberships.find((m) => {
        const plan = getPlan(m.workspace?.plan);
        return plan && plan.price > 0;
      });
      const paidPlan = paidMembership
        ? getPlan(paidMembership.workspace?.plan)
        : null;
      const q = (paidPlan?.quotaLimits ?? {}) as {
        workspacesPerUser?: number | 'unlimited';
      };
      limit = q.workspacesPerUser ?? 'unlimited';
    } else {
      const q = (defaultPlan?.quotaLimits ?? {}) as {
        workspacesPerUser?: number | 'unlimited';
      };
      limit = q.workspacesPerUser ?? 1;
    }

    const canCreate =
      limit === 'unlimited' || (typeof limit === 'number' && count < limit);
    return { count, limit, canCreate };
  }

  private async generateCompanyCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I,O,0,1 để dễ đọc
    for (let i = 0; i < 10; i++) {
      const bytes = randomBytes(6);
      const code = 'LWZ-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
      const found = await this.prisma.workspace.findUnique({
        where: { companyCode: code },
      });
      if (!found) return code;
    }
    return 'LWZ-' + randomBytes(4).toString('hex').toUpperCase();
  }

  async create(userId: string, data: { name: string; plan?: string }) {
    const [limits, defaultPlan] = await Promise.all([
      this.resolveWorkspaceLimit(userId),
      this.plansService.findDefaultPlan(),
    ]);
    const { count, limit, canCreate } = limits;

    if (!canCreate) {
      throw new HttpException(
        {
          message: API_ERROR_WORKSPACE_LIMIT_REACHED,
          code: 'UPGRADE_REQUIRED',
          limit,
          current: count,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const planSlug = data.plan ?? defaultPlan?.slug
    if (!planSlug) {
      throw new HttpException(
        { message: 'No default plan configured. Please create plans in admin.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const companyCode = await this.generateCompanyCode();
    const workspace = await this.prisma.workspace.create({
      data: {
        name: data.name,
        companyCode,
        plan: planSlug,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    const creator = workspace.members[0]?.user;
    if (creator?.email) {
      const frontendUrl = (
        this.configService.get('FRONTEND_URL') ||
        this.configService.get('NEXT_PUBLIC_APP_URL') ||
        'https://lawzy.vn'
      ).replace(/\/$/, '');
      this.emailService
        .sendWorkspaceCreatedEmail({
          toEmail: creator.email,
          toName: creator.name,
          workspaceName: workspace.name,
          dashboardUrl: `${frontendUrl}/dashboard`,
        })
        .catch(() => {});
    }

    return workspace;
  }

  async getWorkspaceLimits(userId: string) {
    return this.resolveWorkspaceLimit(userId);
  }

  async findByUser(userId: string) {
    let memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      memberCount: m.workspace._count.members,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async update(
    id: string,
    data: {
      name?: string;
      plan?: string;
      logo?: string;
      settings?: unknown;
      aiConfig?: unknown;
    },
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const updateData: Prisma.WorkspaceUpdateInput = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.settings !== undefined && {
        settings: data.settings as Prisma.InputJsonValue,
      }),
      ...(data.aiConfig !== undefined && {
        aiConfig: data.aiConfig as Prisma.InputJsonValue,
      }),
    };

    if (data.plan !== undefined) {
      const plan = await this.plansService.findBySlug(data.plan, true);
      updateData.plan = data.plan;
      updateData.quotaLimits = (plan.quotaLimits as object) ?? undefined;
    }

    return this.prisma.workspace.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });
  }

  async delete(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspace.delete({
      where: { id },
    });
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: string,
    inviterUserId?: string,
  ) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const plan = await this.plansService
      .findBySlug(workspace.plan)
      .catch(() => null);
    const quotaLimits = (plan?.quotaLimits ?? {}) as {
      workspaceMembers?: number | 'unlimited';
    };
    const limit = quotaLimits.workspaceMembers;
    const currentCount = workspace._count.members;

    if (
      limit !== 'unlimited' &&
      typeof limit === 'number' &&
      currentCount >= limit
    ) {
      throw new HttpException(
        {
          message: 'MEMBER_LIMIT_REACHED',
          code: 'UPGRADE_REQUIRED',
          limit,
          current: currentCount,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const member = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: role ?? 'viewer',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        workspace: { select: { name: true } },
      },
    });

    if (member.user?.email && inviterUserId && inviterUserId !== userId) {
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterUserId },
        select: { name: true },
      });
      const frontendUrl = (
        this.configService.get('FRONTEND_URL') ||
        this.configService.get('NEXT_PUBLIC_APP_URL') ||
        'https://lawzy.vn'
      ).replace(/\/$/, '');
      this.emailService
        .sendWorkspaceInviteEmail({
          toEmail: member.user.email,
          toName: member.user.name,
          workspaceName: member.workspace.name,
          inviterName: inviter?.name ?? 'Một thành viên',
          dashboardUrl: `${frontendUrl}/dashboard`,
        })
        .catch(() => {});
    }

    return this.prisma.workspaceMember.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    removerUserId?: string,
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in workspace');
    }

    const [removedUser, workspace, remover] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
      removerUserId
        ? this.prisma.user.findUnique({
            where: { id: removerUserId },
            select: { name: true },
          })
        : null,
    ]);

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (
      removedUser?.email &&
      workspace?.name &&
      removerUserId &&
      removerUserId !== userId
    ) {
      const frontendUrl = (
        this.configService.get('FRONTEND_URL') ||
        this.configService.get('NEXT_PUBLIC_APP_URL') ||
        'https://lawzy.vn'
      ).replace(/\/$/, '');
      this.emailService
        .sendMemberRemovedEmail({
          toEmail: removedUser.email,
          toName: removedUser.name,
          workspaceName: workspace.name,
          removerName: remover?.name ?? 'Một thành viên',
          dashboardUrl: `${frontendUrl}/dashboard`,
        })
        .catch(() => {});
    }

    return { success: true };
  }

  async getStats(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const [documentCount, fileCount, sourceCount] = await Promise.all([
      this.prisma.document.count({ where: { workspaceId } }),
      this.prisma.file.count({ where: { workspaceId } }),
      this.prisma.source.count({ where: { workspaceId } }),
    ]);

    return {
      documentCount,
      fileCount,
      sourceCount,
    };
  }

  async findAllForAdmin() {
    return this.prisma.workspace.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });
  }

  async getCustomFields(workspaceId: string) {
    const rows = await this.prisma.workspaceCustomField.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      defaultValue: r.defaultValue,
      isHidden: r.isHidden,
    }));
  }

  async replaceCustomFields(
    workspaceId: string,
    fields: Array<{
      key: string;
      label: string;
      defaultValue?: string | null;
      isHidden?: boolean;
    }>,
  ) {
    const normalized = fields
      .filter((f) => f && typeof f.key === 'string' && f.key.trim().length > 0)
      .map((f, i) => ({
        key: f.key.trim(),
        label: String(f.label ?? '').trim() || f.key.trim(),
        defaultValue:
          f.defaultValue === null || f.defaultValue === undefined
            ? null
            : String(f.defaultValue),
        isHidden: !!f.isHidden,
        sortOrder: i,
      }));

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceCustomField.deleteMany({ where: { workspaceId } });
      for (const f of normalized) {
        await tx.workspaceCustomField.create({
          data: {
            workspaceId,
            key: f.key,
            label: f.label,
            defaultValue: f.defaultValue,
            isHidden: f.isHidden,
            sortOrder: f.sortOrder,
          },
        });
      }
    });

    return this.getCustomFields(workspaceId);
  }

  async ensureMemberCanEdit(workspaceId: string, userId: string) {
    const m = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    if (!m || (m.role !== 'admin' && m.role !== 'editor')) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
