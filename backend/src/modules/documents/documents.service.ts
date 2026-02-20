import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    title: string;
    type?: string;
    workspaceId: string;
    createdBy: string;
    templateId?: string;
    contentJSON?: any;
    metadata?: any;
    mergeFieldValues?: any;
  }) {
    return this.prisma.document.create({
      data: {
        title: data.title,
        type: data.type ?? 'contract',
        workspaceId: data.workspaceId,
        createdBy: data.createdBy,
        templateId: data.templateId,
        contentJSON: data.contentJSON,
        metadata: data.metadata,
        mergeFieldValues: data.mergeFieldValues,
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

  async findById(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
        chatMessages: true,
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(
    id: string,
    data: {
      title?: string;
      status?: string;
      contentJSON?: any;
      metadata?: any;
      mergeFieldValues?: any;
    },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.contentJSON !== undefined && { contentJSON: data.contentJSON }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.mergeFieldValues !== undefined && {
          mergeFieldValues: data.mergeFieldValues,
        }),
      },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async delete(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.document.delete({
      where: { id },
    });
  }

  async createVersion(
    documentId: string,
    data: { contentJSON: any; label?: string; createdBy: string },
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        contentJSON: data.contentJSON,
        label: data.label,
        createdBy: data.createdBy,
      },
    });
  }

  async getVersions(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentByUser(userId: string, limit = 10) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    return this.prisma.document.findMany({
      where: { workspaceId: { in: workspaceIds } },
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

  async getStatsByWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

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
