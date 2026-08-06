import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';

@Injectable()
export class LawfirmAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAudit(params: {
    workspaceId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.lawfirmAuditEvent.create({
      data: {
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? undefined,
      },
    });
  }
}
