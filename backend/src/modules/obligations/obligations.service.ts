import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

@Injectable()
export class ObligationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async findByDocument(userId: string, documentId: string) {
    // Verify document access
    const { workspaceId } = await this.workspaceAccess.requireDocumentAccess(documentId, userId);

    return this.prisma.obligation.findMany({
      where: { documentId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findByWorkspace(userId: string, workspaceId: string, status?: string) {
    // Verify workspace access
    await this.workspaceAccess.requireMembership(workspaceId, userId);

    return this.prisma.obligation.findMany({
      where: {
        workspaceId,
        ...(status && { status }),
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async create(
    userId: string,
    documentId: string,
    data: {
      title: string;
      description?: string;
      status?: string;
      dueDate: Date | string;
      amount?: number;
      percentage?: number;
      triggerCondition?: string;
      obligationType?: string;
      effectivePeriod?: string;
      responsibleVendor?: string;
      picId?: string;
    },
  ) {
    const { workspaceId } = await this.workspaceAccess.requireDocumentAccess(documentId, userId);

    if (!data.title) {
      throw new BadRequestException('Tiêu đề nghĩa vụ không được để trống.');
    }
    if (!data.dueDate) {
      throw new BadRequestException('Ngày đáo hạn không được để trống.');
    }

    return this.prisma.obligation.create({
      data: {
        documentId,
        workspaceId,
        title: data.title,
        description: data.description,
        status: data.status || 'pending',
        dueDate: new Date(data.dueDate),
        amount: data.amount,
        percentage: data.percentage,
        triggerCondition: data.triggerCondition,
        obligationType: data.obligationType,
        effectivePeriod: data.effectivePeriod,
        responsibleVendor: data.responsibleVendor,
        picId: data.picId,
        notifiedStages: [],
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: Date | string;
      amount?: number;
      percentage?: number;
      triggerCondition?: string;
      obligationType?: string;
      effectivePeriod?: string;
      responsibleVendor?: string;
      picId?: string;
    },
  ) {
    const obligation = await this.prisma.obligation.findUnique({
      where: { id },
    });

    if (!obligation) {
      throw new NotFoundException('Không tìm thấy nghĩa vụ.');
    }

    // Verify workspace access
    await this.workspaceAccess.requireMembership(obligation.workspaceId, userId);

    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    return this.prisma.obligation.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(userId: string, id: string) {
    const obligation = await this.prisma.obligation.findUnique({
      where: { id },
    });

    if (!obligation) {
      throw new NotFoundException('Không tìm thấy nghĩa vụ.');
    }

    // Verify workspace access
    await this.workspaceAccess.requireMembership(obligation.workspaceId, userId);

    return this.prisma.obligation.delete({
      where: { id },
    });
  }
}
