import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { EmailService } from '../email/email.service';

export const SUBMISSION_TYPES = [
  'sales_inquiry',
  'feedback',
  'bug_report',
  'support_request',
] as const;

export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

@Injectable()
export class HelpCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submitContact(data: {
    type: 'sales_inquiry';
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message: string;
  }) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        type: data.type,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        description: data.message,
        title: null,
        status: 'pending',
      },
    });

    await this.emailService.sendFeedbackToTeam({
      userName: data.name,
      userEmail: data.email,
      type: 'Liên hệ tư vấn / Sales Lead',
      title: data.company ? `${data.company} - ${data.name}` : data.name,
      description: [
        data.phone && `Điện thoại: ${data.phone}`,
        data.company && `Công ty: ${data.company}`,
        '',
        data.message,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return { success: true, id: submission.id };
  }

  async submitFeedback(data: {
    userName: string;
    userEmail: string;
    userId?: string;
    type: string;
    title: string;
    description: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }) {
    const attachmentRefs =
      data.attachments?.map((a) => ({ filename: a.filename })) ?? null;

    const submission = await this.prisma.contactSubmission.create({
      data: {
        type: data.type,
        name: data.userName,
        email: data.userEmail,
        userId: data.userId ?? null,
        title: data.title,
        description: data.description,
        status: 'pending',
        attachments: attachmentRefs
          ? (attachmentRefs as object)
          : Prisma.JsonNull,
      },
    });

    await this.emailService.sendFeedbackToTeam({
      userName: data.userName,
      userEmail: data.userEmail,
      type: data.type,
      title: data.title,
      description: data.description,
      attachments: data.attachments,
    });

    await this.emailService.sendFeedbackReceiptToUser(
      data.userEmail,
      data.type,
    );

    return { success: true, id: submission.id };
  }

  async listSubmissions(params: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contactSubmission.count({ where }),
    ]);

    return { data: items, total, page, limit };
  }

  async updateStatus(id: string, status: string) {
    const valid = ['pending', 'processed', 'archived'];
    if (!valid.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${valid.join(', ')}`,
      );
    }
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  }
}
