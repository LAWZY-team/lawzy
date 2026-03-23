import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
  ) {}

  async create(userId: string, data: { name: string; plan?: string }) {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        plan: data.plan ?? 'free',
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

    // Nếu user chưa thuộc workspace nào, tự động thêm vào workspace mặc định (workspace đầu tiên)
    if (memberships.length === 0) {
      const defaultWorkspace = await this.prisma.workspace.findFirst();

      if (defaultWorkspace) {
        const membership = await this.prisma.workspaceMember.create({
          data: {
            workspaceId: defaultWorkspace.id,
            userId,
            role: 'admin',
          },
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

        memberships = [membership];
      }
    }

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

    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.settings !== undefined && {
          settings: data.settings as Prisma.InputJsonValue,
        }),
        ...(data.aiConfig !== undefined && {
          aiConfig: data.aiConfig as Prisma.InputJsonValue,
        }),
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

  async addMember(workspaceId: string, userId: string, role: string) {
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

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: role ?? 'viewer',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in workspace');
    }

    return this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
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
