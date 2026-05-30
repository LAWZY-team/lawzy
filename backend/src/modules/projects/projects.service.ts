import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async create(
    userId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      workspaceId: string;
    },
  ) {
    await this.workspaceAccess.requireMembership(data.workspaceId, userId);

    const formattedCode = data.code.trim().toUpperCase();
    if (!formattedCode) {
      throw new BadRequestException('Mã dự án không được để trống.');
    }

    // Check project code uniqueness in workspace
    const existingProject = await this.prisma.project.findFirst({
      where: {
        workspaceId: data.workspaceId,
        code: formattedCode,
      },
    });

    if (existingProject) {
      throw new BadRequestException(
        'Mã dự án này đã tồn tại trong hệ thống. Vui lòng chọn mã khác.',
      );
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        code: formattedCode,
        description: data.description,
        workspaceId: data.workspaceId,
      },
    });
  }

  async findByWorkspace(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  async findById(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        documents: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            parentId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    return project;
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; description?: string },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async delete(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
