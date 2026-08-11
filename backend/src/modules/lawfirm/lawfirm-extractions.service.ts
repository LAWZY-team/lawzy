import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { LawfirmAuditService } from './lawfirm-audit.service';
import { serializeExtraction } from './utils/lawfirm-serializer';
import {
  ApproveExtractionDto,
  RejectExtractionDto,
} from './dto/extraction.dto';
import { toCurrentLawfirmProfileFieldKey } from './lawfirm-field-taxonomy';

@Injectable()
export class LawfirmExtractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly auditService: LawfirmAuditService,
  ) {}

  async list(userId: string, workspaceId: string, profileId?: string) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const extractions = await this.prisma.lawfirmAiExtraction.findMany({
      where: {
        workspaceId,
        ...(profileId ? { profileId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return extractions.map(serializeExtraction);
  }

  async approve(userId: string, id: string, dto: ApproveExtractionDto) {
    const extraction = await this.prisma.lawfirmAiExtraction.findUnique({
      where: { id },
      include: { profile: { include: { fields: true } } },
    });
    if (!extraction) throw new NotFoundException('Extraction not found');
    if (!extraction.profileId || !extraction.profile) {
      throw new BadRequestException('Extraction is not linked to a profile');
    }
    await this.workspaceAccess.requireMembership(
      extraction.workspaceId,
      userId,
    );
    if (extraction.status !== 'pending') {
      throw new BadRequestException(
        `Extraction is already ${extraction.status}`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const approved of dto.approvedFields) {
        const approvedFieldKey = toCurrentLawfirmProfileFieldKey(
          approved.fieldKey,
        );
        if (!approvedFieldKey) {
          throw new BadRequestException(
            `Unsupported extracted field key: ${approved.fieldKey}`,
          );
        }
        const existingField = extraction.profile!.fields.find(
          (field) =>
            toCurrentLawfirmProfileFieldKey(field.fieldKey) ===
            approvedFieldKey,
        );
        if (existingField) {
          await tx.lawfirmProfileField.update({
            where: { id: existingField.id },
            data: {
              value: approved.value,
              ...(approved.label !== undefined && { label: approved.label }),
              ...(approved.aliases !== undefined && {
                aliases: approved.aliases,
              }),
            },
          });
        } else {
          await tx.lawfirmProfileField.create({
            data: {
              profileId: extraction.profileId!,
              fieldKey: approvedFieldKey,
              group: approved.group ?? 'other',
              label: approved.label ?? approved.fieldKey,
              value: approved.value,
              aliases: approved.aliases ?? '',
            },
          });
        }
      }
      await tx.lawfirmClientProfile.update({
        where: { id: extraction.profileId! },
        data: { revision: { increment: 1 } },
      });
      await tx.lawfirmAiExtraction.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          suggestions: dto.approvedFields as unknown as Prisma.InputJsonValue,
        },
      });
    });
    await this.auditService.logAudit({
      workspaceId: extraction.workspaceId,
      actorId: userId,
      action: 'extraction.approve',
      entityType: 'lawfirm_ai_extraction',
      entityId: id,
      metadata: {
        profileId: extraction.profileId,
        fieldCount: dto.approvedFields.length,
      },
    });
    const updated = await this.prisma.lawfirmAiExtraction.findUnique({
      where: { id },
    });
    return serializeExtraction(updated!);
  }

  async reject(userId: string, id: string, dto: RejectExtractionDto) {
    const extraction = await this.prisma.lawfirmAiExtraction.findUnique({
      where: { id },
    });
    if (!extraction) throw new NotFoundException('Extraction not found');
    await this.workspaceAccess.requireMembership(
      extraction.workspaceId,
      userId,
    );
    if (extraction.status !== 'pending') {
      throw new BadRequestException(
        `Extraction is already ${extraction.status}`,
      );
    }
    const updated = await this.prisma.lawfirmAiExtraction.update({
      where: { id },
      data: {
        status: 'rejected',
        errorMessage: dto.reason ?? 'Rejected by user',
      },
    });
    await this.auditService.logAudit({
      workspaceId: extraction.workspaceId,
      actorId: userId,
      action: 'extraction.reject',
      entityType: 'lawfirm_ai_extraction',
      entityId: id,
      metadata: { reason: dto.reason ?? null },
    });
    return serializeExtraction(updated);
  }
}
