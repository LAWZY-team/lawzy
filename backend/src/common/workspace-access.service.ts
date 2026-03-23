import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../integrations/prisma/prisma.service';

const NOT_FOUND = 'Not found';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(workspaceId: string, userId: string): Promise<void> {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!m) throw new NotFoundException(NOT_FOUND);
  }

  getUserFirstWorkspaceId(userId: string): Promise<string | null> {
    return this.prisma.workspaceMember
      .findFirst({
        where: { userId },
        select: { workspaceId: true },
      })
      .then((m) => m?.workspaceId ?? null);
  }

  async requireDocumentAccess(
    documentId: string,
    userId: string,
  ): Promise<{ workspaceId: string }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { workspaceId: true },
    });
    if (!doc) throw new NotFoundException(NOT_FOUND);
    await this.requireMembership(doc.workspaceId, userId);
    return { workspaceId: doc.workspaceId };
  }

  async hasMembership(workspaceId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return !!m;
  }
}
