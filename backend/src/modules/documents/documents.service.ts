import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  /**
   * MySQL JSON columns may store a serialised *string* instead of an object
   * when data was inserted via external tools (NocoDB, raw SQL, imports).
   * This helper transparently parses such values so callers always receive
   * proper objects/arrays.
   */
  private parseJsonIfString(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  async create(data: {
    title: string;
    type?: string;
    workspaceId: string;
    createdBy: string;
    templateId?: string;
    contentJSON?: any;
    metadata?: any;
    mergeFieldValues?: any;
    status?: string;
    visibility?: 'private' | 'workspace';
  }) {
    await this.workspaceAccess.requireMembership(
      data.workspaceId,
      data.createdBy,
    );
    const visibility = data.visibility ?? 'workspace';
    if (!['private', 'workspace'].includes(visibility)) {
      throw new BadRequestException('Invalid visibility');
    }
    return this.prisma.document.create({
      data: {
        title: data.title,
        type: data.type ?? 'contract',
        visibility,
        workspaceId: data.workspaceId,
        createdBy: data.createdBy,
        templateId: data.templateId,
        contentJSON: data.contentJSON,
        metadata: data.metadata,
        mergeFieldValues: data.mergeFieldValues,
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async findByWorkspace(
    workspaceId: string,
    opts?: {
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: { name: true, avatar: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async getUserWorkspaceIds(userId: string, scopeWorkspaceId?: string | null): Promise<string[]> {
    const memberOf = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const ids = memberOf.map((m) => m.workspaceId);
    if (scopeWorkspaceId && ids.includes(scopeWorkspaceId)) return [scopeWorkspaceId];
    return ids;
  }

  async findByUser(
    userId: string,
    opts?: {
      workspaceId?: string;
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const scopeWorkspaceId = opts?.workspaceId || undefined;
    const workspaceIds = await this.getUserWorkspaceIds(userId, scopeWorkspaceId);
    const empty = { data: [], total: 0, page: 1, limit: opts?.limit ?? 50 };
    if (workspaceIds.length === 0) return empty;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    // private: only creator; workspace: all members see
    const where: {
      workspaceId: { in: string[] };
      OR: Array<{ visibility: string; createdBy?: string }>;
      status?: string;
      type?: string;
    } = {
      workspaceId: { in: workspaceIds },
      OR: [
        { visibility: 'workspace' },
        { visibility: 'private', createdBy: userId },
      ],
    };
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true } },
          creator: {
            select: { name: true, avatar: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Documents shared with user: visibility=workspace, user is member, NOT creator
   */
  async findSharedByUser(
    userId: string,
    opts?: { workspaceId?: string; page?: number; limit?: number },
  ) {
    const scopeWorkspaceId = opts?.workspaceId || undefined;
    const workspaceIds = await this.getUserWorkspaceIds(userId, scopeWorkspaceId);
    const empty = { data: [], total: 0, page: 1, limit: opts?.limit ?? 50 };
    if (workspaceIds.length === 0) return empty;

    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = {
      workspaceId: { in: workspaceIds },
      visibility: 'workspace',
      createdBy: { not: userId },
    };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          workspace: { select: { id: true, name: true } },
          creator: {
            select: { name: true, avatar: true },
          },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  getDefaultWorkspaceId(userId: string): Promise<string | null> {
    return this.workspaceAccess.getUserFirstWorkspaceId(userId);
  }

  async findById(id: string, userId?: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
        chatMessages: { orderBy: { createdAt: 'asc' } },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (userId) {
      await this.workspaceAccess.requireDocumentAccess(id, userId);
    }

    return {
      ...document,
      contentJSON: this.parseJsonIfString(document.contentJSON),
      metadata: this.parseJsonIfString(document.metadata),
      mergeFieldValues: this.parseJsonIfString(document.mergeFieldValues),
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      status?: string;
      contentJSON?: any;
      metadata?: any;
      mergeFieldValues?: any;
      visibility?: 'private' | 'workspace';
    },
    userId: string,
  ) {
    await this.workspaceAccess.requireDocumentAccess(id, userId);

    if (
      data.visibility !== undefined &&
      !['private', 'workspace'].includes(data.visibility)
    ) {
      throw new BadRequestException('Invalid visibility');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
        ...(data.contentJSON !== undefined && {
          contentJSON: this.parseJsonIfString(data.contentJSON) as any,
        }),
        ...(data.metadata !== undefined && {
          metadata: this.parseJsonIfString(data.metadata) as any,
        }),
        ...(data.mergeFieldValues !== undefined && {
          mergeFieldValues: this.parseJsonIfString(
            data.mergeFieldValues,
          ) as any,
        }),
      },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.workspaceAccess.requireDocumentAccess(id, userId);

    return this.prisma.document.delete({
      where: { id },
    });
  }

  async createVersion(
    documentId: string,
    data: {
      contentJSON: any;
      mergeFieldValues?: any;
      chatCursorAt?: string;
      label?: string;
      createdBy: string;
    },
  ) {
    await this.workspaceAccess.requireDocumentAccess(documentId, data.createdBy);

    let chatCursorAt: Date | undefined;
    if (
      data.chatCursorAt != null &&
      typeof data.chatCursorAt === 'string' &&
      data.chatCursorAt.trim() !== ''
    ) {
      const d = new Date(data.chatCursorAt);
      if (!Number.isNaN(d.getTime())) {
        chatCursorAt = d;
      }
    }

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        contentJSON:
          data.contentJSON !== undefined
            ? (this.parseJsonIfString(data.contentJSON) as any)
            : undefined,
        ...(data.mergeFieldValues !== undefined && {
          mergeFieldValues: this.parseJsonIfString(
            data.mergeFieldValues,
          ) as any,
        }),
        ...(chatCursorAt !== undefined && { chatCursorAt }),
        label: data.label,
        createdBy: data.createdBy,
      },
    });
  }

  async updateVersion(
    documentId: string,
    versionId: string,
    data: { label: string },
    userId: string,
  ) {
    await this.workspaceAccess.requireDocumentAccess(documentId, userId);

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return this.prisma.documentVersion.update({
      where: { id: versionId },
      data: { label: data.label },
    });
  }

  async getVersions(documentId: string, userId: string) {
    await this.workspaceAccess.requireDocumentAccess(documentId, userId);

    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVersion(documentId: string, versionId: string, userId: string) {
    await this.workspaceAccess.requireDocumentAccess(documentId, userId);

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return {
      ...version,
      contentJSON: this.parseJsonIfString(version.contentJSON),
      mergeFieldValues: this.parseJsonIfString(version.mergeFieldValues),
    };
  }

  async createChatMessage(
    documentId: string,
    data: {
      userId: string;
      role: 'user' | 'assistant';
      content: string;
      metadata?: any;
    },
  ) {
    await this.workspaceAccess.requireDocumentAccess(documentId, data.userId);

    return this.prisma.chatMessage.create({
      data: {
        documentId,
        userId: data.userId,
        role: data.role,
        content: data.content,
        metadata: data.metadata,
      },
    });
  }

  async getChatMessages(
    documentId: string,
    opts: { userId: string; to?: string },
  ) {
    await this.workspaceAccess.requireDocumentAccess(documentId, opts.userId);

    const toDate =
      opts.to && typeof opts.to === 'string' && opts.to.trim().length > 0
        ? new Date(opts.to)
        : undefined;
    const effectiveToDate =
      toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;

    return this.prisma.chatMessage.findMany({
      where: {
        documentId,
        ...(effectiveToDate ? { createdAt: { lte: effectiveToDate } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRecentByUser(userId: string, limit = 10) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    return this.prisma.document.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        OR: [
          { visibility: 'workspace' },
          { visibility: 'private', createdBy: userId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getStatsByWorkspace(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const [byStatus, byType] = await Promise.all([
      this.prisma.document.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { id: true },
      }),
      this.prisma.document.groupBy({
        by: ['type'],
        where: { workspaceId },
        _count: { id: true },
      }),
    ]);

    return {
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count.id]),
      ),
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count.id])),
      total: byStatus.reduce((sum, s) => sum + s._count.id, 0),
    };
  }

  async getStatsOverview(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const [total, drafts, completed] = await Promise.all([
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
          status: 'completed',
        },
      }),
    ]);

    return {
      total,
      drafts,
      completed,
    };
  }
}
