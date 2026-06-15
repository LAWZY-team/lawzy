import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { ProjectImportService } from './project-import.service';
import { serializeDocument, serializeProject } from '../lpms-ai/lpms-serializer';

const serializeFolder = (folder: Record<string, unknown>) => ({
  id: folder.id,
  project_id: folder.projectId,
  name: folder.name,
  parent_folder_id: folder.parentFolderId ?? null,
  created_at:
    folder.createdAt instanceof Date
      ? folder.createdAt.toISOString()
      : String(folder.createdAt ?? ''),
  updated_at:
    folder.updatedAt instanceof Date
      ? folder.updatedAt.toISOString()
      : String(folder.updatedAt ?? ''),
});

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly projectImport: ProjectImportService,
  ) {}

  async create(
    userId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      workspaceId: string;
      sharedWith?: string[];
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

    const created = await this.prisma.project.create({
      data: {
        name: data.name,
        code: formattedCode,
        description: data.description,
        workspaceId: data.workspaceId,
        createdBy: userId,
        sharedWith: data.sharedWith ?? [],
      },
    });
    return serializeProject({
      ...created,
      userId,
      is_owner: true,
    } as unknown as Record<string, unknown>);
  }

  async findByWorkspace(userId: string, workspaceId: string) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { documents: true, tabularReviews: true, lpmsChats: true },
        },
      },
    });
    return projects.map((p) =>
      serializeProject({
        ...p,
        userId: p.createdBy,
        is_owner: p.createdBy === userId,
        document_count: p._count.documents,
        review_count: p._count.tabularReviews,
        chat_count: p._count.lpmsChats,
      } as unknown as Record<string, unknown>),
    );
  }

  async findById(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        documents: {
          where: { deletedAt: null },
          include: { files: true },
        },
        folders: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    return serializeProject({
      ...project,
      userId: project.createdBy,
      is_owner: project.createdBy === userId,
      documents: project.documents.map((d) =>
        serializeDocument({ ...d, folderId: d.folderId } as unknown as Record<string, unknown>),
      ),
      folders: project.folders.map((f) =>
        serializeFolder(f as unknown as Record<string, unknown>),
      ),
    } as unknown as Record<string, unknown>);
  }

  async update(
    userId: string,
    id: string,
    data: { name?: string; description?: string; code?: string; sharedWith?: string[] },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.code !== undefined && { code: data.code.trim().toUpperCase() }),
        ...(data.sharedWith !== undefined && { sharedWith: data.sharedWith }),
      },
    });
    return serializeProject({
      ...updated,
      userId: updated.createdBy,
      is_owner: updated.createdBy === userId,
    } as unknown as Record<string, unknown>);
  }

  async delete(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  async getPeople(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    const owner = project.createdBy
      ? await this.prisma.user.findUnique({
          where: { id: project.createdBy },
          select: { id: true, email: true, name: true },
        })
      : null;
    const sharedEmails = (project.sharedWith as string[] | null) ?? [];
    const members = await this.prisma.user.findMany({
      where: { email: { in: sharedEmails } },
      select: { email: true, name: true },
    });
    const byEmail = new Map(members.map((m) => [m.email, m.name]));
    return {
      owner: {
        user_id: owner?.id ?? project.createdBy,
        email: owner?.email ?? null,
        display_name: owner?.name ?? null,
      },
      members: sharedEmails.map((email) => ({
        email,
        display_name: byEmail.get(email) ?? null,
      })),
    };
  }

  async listChats(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    const chats = await this.prisma.lpmsChat.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
    return chats.map((c) => ({
      id: c.id,
      user_id: c.userId,
      project_id: c.projectId,
      title: c.title,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    }));
  }

  async uploadDocument(userId: string, projectId: string, file: Express.Multer.File) {
    const result = await this.projectImport.importFiles(userId, projectId, [file]);
    const doc = result.documents[0];
    if (!doc) throw new BadRequestException('Upload failed');
    const full = await this.prisma.document.findUnique({
      where: { id: doc.id },
      include: { files: true },
    });
    return serializeDocument(full as unknown as Record<string, unknown>);
  }

  async createFolder(
    userId: string,
    projectId: string,
    name: string,
    parentFolderId?: string | null,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    const folder = await this.prisma.projectFolder.create({
      data: { projectId, userId, name: name.trim(), parentFolderId: parentFolderId ?? null },
    });
    return serializeFolder(folder as unknown as Record<string, unknown>);
  }

  async updateFolder(
    userId: string,
    projectId: string,
    folderId: string,
    updates: { name?: string; parentFolderId?: string | null },
  ) {
    await this.ensureProjectAccess(userId, projectId);
    const folder = await this.prisma.projectFolder.findFirst({
      where: { id: folderId, projectId },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    const updated = await this.prisma.projectFolder.update({
      where: { id: folderId },
      data: {
        ...(updates.name !== undefined && { name: updates.name.trim() }),
        ...(updates.parentFolderId !== undefined && { parentFolderId: updates.parentFolderId }),
      },
    });
    return serializeFolder(updated as unknown as Record<string, unknown>);
  }

  async deleteFolder(userId: string, projectId: string, folderId: string) {
    await this.ensureProjectAccess(userId, projectId);
    const descendants = await this.collectFolderDescendants(projectId, folderId);
    const allFolderIds = [folderId, ...descendants];
    await this.prisma.document.deleteMany({
      where: { projectId, folderId: { in: allFolderIds } },
    });
    await this.prisma.projectFolder.deleteMany({
      where: { id: { in: allFolderIds } },
    });
    return { success: true };
  }

  private async collectFolderDescendants(projectId: string, rootId: string): Promise<string[]> {
    const folders = await this.prisma.projectFolder.findMany({ where: { projectId } });
    const childrenMap = new Map<string, string[]>();
    for (const f of folders) {
      if (!f.parentFolderId) continue;
      const list = childrenMap.get(f.parentFolderId) ?? [];
      list.push(f.id);
      childrenMap.set(f.parentFolderId, list);
    }
    const out: string[] = [];
    const stack = [...(childrenMap.get(rootId) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      out.push(id);
      stack.push(...(childrenMap.get(id) ?? []));
    }
    return out;
  }

  async moveDocumentToFolder(
    userId: string,
    projectId: string,
    documentId: string,
    folderId: string | null,
  ) {
    await this.ensureProjectAccess(userId, projectId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, projectId },
      include: { files: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { folderId },
      include: { files: true },
    });
    return serializeDocument(updated as unknown as Record<string, unknown>);
  }

  async renameDocument(
    userId: string,
    projectId: string,
    documentId: string,
    filename: string,
  ) {
    await this.ensureProjectAccess(userId, projectId);
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { title: filename.trim() },
      include: { files: true },
    });
    return serializeDocument(updated as unknown as Record<string, unknown>);
  }

  private async ensureProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);
    return project;
  }
}
