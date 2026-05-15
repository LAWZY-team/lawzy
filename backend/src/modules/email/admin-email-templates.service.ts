import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { EmailService } from './email.service';
import type { Prisma } from '@prisma/client';

export const EMAIL_TEMPLATE_CODES = [
  { code: 'workspace_invite', name: 'Mời thành viên vào workspace' },
  { code: 'member_removed', name: 'Xóa thành viên khỏi workspace' },
  { code: 'workspace_created', name: 'Tạo workspace mới' },
  { code: 'welcome_back', name: 'Đăng nhập trở lại' },
  { code: 'payment_success', name: 'Thanh toán thành công' },
  { code: 'plan_upgrade', name: 'Nâng cấp plan' },
] as const;

@Injectable()
export class AdminEmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async list() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { code: 'asc' },
    });
  }

  getAvailableCodes() {
    return EMAIL_TEMPLATE_CODES;
  }

  async getById(id: string) {
    const t = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });
    if (!t) throw new NotFoundException('Email template not found');
    return t;
  }

  async getByCode(code: string) {
    return this.prisma.emailTemplate.findUnique({
      where: { code },
    });
  }

  async create(data: {
    code: string;
    name: string;
    description?: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
    isActive?: boolean;
  }) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictException(`Template with code "${data.code}" already exists`);
    }

    return this.prisma.emailTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        variables: (data.variables ?? []) as unknown as Prisma.JsonArray,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      subject: string;
      bodyHtml: string;
      variables: string[];
      isActive: boolean;
    }>,
  ) {
    await this.getById(id);
    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.bodyHtml !== undefined && { bodyHtml: data.bodyHtml }),
        ...(data.variables !== undefined && {
          variables: data.variables as unknown as Prisma.JsonArray,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }

  async sendTest(id: string, toEmail: string, variables?: Record<string, string>) {
    const template = await this.getById(id);
    const vars = variables ?? {};
    const defaults: Record<string, string> = {
      toName: vars.toName ?? '[Tên người nhận]',
      workspaceName: vars.workspaceName ?? '[Tên workspace]',
      inviterName: vars.inviterName ?? '[Người mời]',
      removerName: vars.removerName ?? '[Người xóa]',
      dashboardUrl: vars.dashboardUrl ?? (process.env.FRONTEND_URL || 'https://lawzy.vn').replace(/\/$/, '') + '/dashboard',
      planName: vars.planName ?? '[Gói]',
      amount: vars.amount ?? '0',
      newPlanName: vars.newPlanName ?? '[Gói mới]',
    };
    const merged = { ...defaults, ...vars };
    return this.emailService.sendFromTemplate(template.code, toEmail, merged);
  }
}
