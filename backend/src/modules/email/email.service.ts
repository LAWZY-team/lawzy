import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { buildLawzyEmailHtml } from './email-template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Email sending disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  private ensureTransporter(): void {
    if (!this.transporter) {
      throw new Error(
        'Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.',
      );
    }
  }

  async sendOTPEmail(email: string, name: string, otp: string): Promise<void> {
    const mailOptions = {
      from: 'contact@lawzy.vn',
      to: email,
      subject: 'Mã OTP đăng ký tài khoản Lawzy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; background-color: #faf9f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
            .header { background-color: #ffffff; padding: 25px 20px; text-align: center; border-bottom: 2px solid #faf9f5; }
            .content { padding: 30px; }
            .otp-code { font-size: 32px; font-weight: bold; text-align: center; color: #f54900; letter-spacing: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Xác thực tài khoản</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${name}</strong>,</p>
              <p>Cảm ơn bạn đã đăng ký tài khoản tại Lawzy. Vui lòng sử dụng mã OTP sau để hoàn tất đăng ký:</p>
              <div class="otp-code">${otp}</div>
              <p>Mã OTP này có hiệu lực trong <strong>10 phút</strong>.</p>
              <p>Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Lawzy. Nền tảng quản lý hợp đồng pháp lý.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      this.ensureTransporter();
      await this.transporter!.sendMail(mailOptions);
    } catch (error) {
      throw new Error(
        `Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendPublicShareAccessEmail(data: {
    toEmail: string;
    title: string;
    accessCode: string;
    shareUrlToken: string;
  }): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const shareUrl = `${frontendUrl.replace(/\/$/, '')}/share/${encodeURIComponent(
      data.shareUrlToken,
    )}`;

    const html = buildLawzyEmailHtml({
      title: 'Truy cập hợp đồng trên Lawzy',
      greeting: `Xin chào,`,
      body: `
        <p>Bạn nhận được một hợp đồng được chia sẻ qua Lawzy với tiêu đề:</p>
        <p><strong>${data.title}</strong></p>
        <p>Để truy cập, vui lòng sử dụng mã truy cập dưới đây và làm theo hướng dẫn trên trang:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 12px 0;">${data.accessCode}</p>
        <p>Bạn có thể mở trực tiếp đường dẫn sau:</p>
      `,
      button: { text: 'Mở hợp đồng', url: shareUrl },
      footerNote:
        'Vì lý do bảo mật, bạn có thể được yêu cầu nhập thêm mã OTP gửi qua email khi truy cập.',
    });

    await this.sendIfConfigured({
      to: data.toEmail,
      subject: '[Lawzy] Mã truy cập hợp đồng',
      html,
    });
  }

  async sendPublicShareOtpEmail(data: {
    toEmail: string;
    title: string;
    otp: string;
  }): Promise<void> {
    const html = buildLawzyEmailHtml({
      title: 'Mã OTP truy cập hợp đồng',
      greeting: `Xin chào,`,
      body: `
        <p>Bạn đang yêu cầu truy cập hợp đồng:</p>
        <p><strong>${data.title}</strong></p>
        <p>Vui lòng nhập mã OTP sau trên trang Lawzy để tiếp tục:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${data.otp}</p>
        <p>Mã OTP có hiệu lực trong <strong>10 phút</strong>.</p>
      `,
      button: undefined,
      footerNote:
        'Nếu bạn không thực hiện yêu cầu này, có thể bỏ qua email. Mã sẽ hết hạn sau 10 phút.',
    });

    await this.sendIfConfigured({
      to: data.toEmail,
      subject: '[Lawzy] Mã OTP truy cập hợp đồng',
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    const html = buildLawzyEmailHtml({
      title: 'Đặt lại mật khẩu',
      greeting: `Xin chào <strong>${name}</strong>`,
      body: `
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu. Hiệu lực trong <strong>1 giờ</strong>.</p>
      `,
      button: { text: 'Đặt lại mật khẩu', url: resetLink },
      footerNote:
        'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.',
    });

    try {
      this.ensureTransporter();
      await this.transporter!.sendMail({
        from: 'contact@lawzy.vn',
        to: email,
        subject: 'Đặt lại mật khẩu Lawzy',
        html,
      });
    } catch (error) {
      throw new Error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Gửi email từ template lưu trong DB.
   * Nếu không có template hoặc template inactive, không gửi (trả về).
   */
  async sendFromTemplate(
    code: string,
    toEmail: string,
    variables: Record<string, string>,
  ): Promise<boolean> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { code },
    });
    if (!template || !template.isActive) {
      this.logger.debug(`Email template "${code}" not found or inactive, skip send`);
      return false;
    }

    const replaceVars = (str: string): string => {
      let result = str;
      for (const [key, val] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val ?? '');
      }
      return result;
    };

    const subject = replaceVars(template.subject);
    const html = replaceVars(template.bodyHtml);

    await this.sendIfConfigured({ to: toEmail, subject, html });
    return true;
  }

  async sendWorkspaceInviteEmail(data: {
    toEmail: string
    toName: string
    workspaceName: string
    inviterName: string
    dashboardUrl: string
  }): Promise<void> {
    const sent = await this.sendFromTemplate('workspace_invite', data.toEmail, {
      toName: data.toName,
      workspaceName: data.workspaceName,
      inviterName: data.inviterName,
      dashboardUrl: data.dashboardUrl,
    });
    if (!sent) {
      this.logger.warn('workspace_invite template not found in DB, email not sent. Run prisma seed.');
    }
  }

  async sendMemberRemovedEmail(data: {
    toEmail: string
    toName: string
    workspaceName: string
    removerName: string
    dashboardUrl: string
  }): Promise<void> {
    const sent = await this.sendFromTemplate('member_removed', data.toEmail, {
      toName: data.toName,
      workspaceName: data.workspaceName,
      removerName: data.removerName,
      dashboardUrl: data.dashboardUrl,
    });
    if (!sent) {
      this.logger.warn('member_removed template not found in DB, email not sent. Run prisma seed.');
    }
  }

  async sendWorkspaceCreatedEmail(data: {
    toEmail: string
    toName: string
    workspaceName: string
    dashboardUrl: string
  }): Promise<void> {
    const sent = await this.sendFromTemplate('workspace_created', data.toEmail, {
      toName: data.toName,
      workspaceName: data.workspaceName,
      dashboardUrl: data.dashboardUrl,
    });
    if (!sent) {
      this.logger.warn('workspace_created template not found in DB, email not sent. Run prisma seed.');
    }
  }

  async sendWelcomeBackEmail(data: {
    toEmail: string
    toName: string
    dashboardUrl: string
  }): Promise<void> {
    const used = await this.sendFromTemplate('welcome_back', data.toEmail, {
      toName: data.toName,
      dashboardUrl: data.dashboardUrl,
    });
    if (used) return;

    const html = buildLawzyEmailHtml({
      title: 'Chào mừng trở lại Lawzy',
      greeting: `Xin chào <strong>${data.toName}</strong>`,
      body: `
        <p>Chúng tôi nhận thấy bạn vừa đăng nhập vào Lawzy.</p>
        <p>Nếu không phải bạn thực hiện đăng nhập này, vui lòng đổi mật khẩu ngay qua trang cài đặt tài khoản.</p>
      `,
      button: { text: 'Mở Dashboard', url: data.dashboardUrl },
    });

    await this.sendIfConfigured({
      to: data.toEmail,
      subject: '[Lawzy] Chào mừng trở lại',
      html,
    });
  }

  async sendPaymentSuccessEmail(data: {
    toEmail: string
    toName: string
    planName: string
    amount: number
    workspaceName: string
    dashboardUrl: string
  }): Promise<void> {
    const sent = await this.sendFromTemplate('payment_success', data.toEmail, {
      toName: data.toName,
      planName: data.planName,
      amount: data.amount.toLocaleString('vi-VN'),
      workspaceName: data.workspaceName,
      dashboardUrl: data.dashboardUrl,
    });
    if (!sent) {
      this.logger.warn('payment_success template not found in DB, email not sent. Run prisma seed.');
    }
  }

  async sendPlanUpgradeEmail(data: {
    toEmail: string
    toName: string
    workspaceName: string
    newPlanName: string
    dashboardUrl: string
  }): Promise<void> {
    const sent = await this.sendFromTemplate('plan_upgrade', data.toEmail, {
      toName: data.toName,
      workspaceName: data.workspaceName,
      newPlanName: data.newPlanName,
      dashboardUrl: data.dashboardUrl,
    });
    if (!sent) {
      this.logger.warn('plan_upgrade template not found in DB, email not sent. Run prisma seed.');
    }
  }

  private async sendIfConfigured(opts: {
    to: string
    subject: string
    html: string
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): ${opts.subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: 'contact@lawzy.vn',
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendFeedbackToTeam(data: {
    userName: string;
    userEmail: string;
    type: string;
    title: string;
    description: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }): Promise<void> {
    const mailOptions = {
      from: 'contact@lawzy.vn',
      to: 'contact@lawzy.vn',
      subject: `[Lawzy Help Center] ${data.type}: ${data.title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #f54900;">Yêu cầu hỗ trợ mới</h2>
          <p><strong>Người gửi:</strong> ${data.userName} (${data.userEmail})</p>
          <p><strong>Loại:</strong> ${data.type}</p>
          <p><strong>Tiêu đề:</strong> ${data.title}</p>
          <hr />
          <p><strong>Mô tả:</strong></p>
          <div style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 5px;">${data.description}</div>
        </div>
      `,
      attachments: data.attachments,
    };

    this.ensureTransporter();
    await this.transporter!.sendMail(mailOptions);
  }

  async sendFeedbackReceiptToUser(email: string, type: string): Promise<void> {
    const timestamp = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const mailOptions = {
      from: 'contact@lawzy.vn',
      to: email,
      subject: '[Lawzy Help Center]Lawzy đã nhận được ý kiến của bạn',
      html: `
        <div style="font-family: 'Inter', system-ui, sans-serif; padding: 40px 20px; color: #000000; background-color: #ffffff; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #000000; padding: 40px;">
            <div style="margin-bottom: 30px; border-bottom: 1px solid #000000; padding-bottom: 20px;">
              <h1 style="font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Lawzy Support</h1>
            </div>
            
            <p>Xin chào <strong>${email}</strong>,</p>
            
            <p>Cảm ơn bạn đã thông báo lỗi/góp ý trong quá trình sử dụng Lawzy.</p>
            
            <p>Chúng tôi đã ghi nhận yêu cầu của bạn với thông tin như sau:</p>
            
            <div style="background-color: #f8f8f8; padding: 20px; border: 1px solid #e5e5e5; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Thời gian tiếp nhận:</strong> ${timestamp}</p>
              <p style="margin: 5px 0;"><strong>Loại yêu cầu:</strong> ${type.toUpperCase()}</p>
            </div>
            
            <p>Đội ngũ kỹ thuật của Lawzy sẽ tiến hành kiểm tra và phản hồi trong tối đa 24 giờ làm việc.</p>
            
            <p>Trong trường hợp cần thêm thông tin để tiến hành hỗ trợ, chúng tôi có thể liên hệ lại với bạn qua email này.</p>
            
            <p>Phản hồi của bạn đóng vai trò rất quan trọng trong việc giúp Lawzy cải thiện và hoàn thiện sản phẩm.</p>
            
            <div style="margin-top: 40px; border-top: 1px solid #000000; padding-top: 20px;">
              <p style="margin: 0;">Trân trọng cảm ơn bạn đã đồng hành cùng Lawzy.</p>
              <p style="margin: 5px 0; font-weight: bold;">Lawzy Support Team</p>
              <p style="margin: 0; color: #666666;">contact@lawzy.vn</p>
            </div>
          </div>
        </div>
      `,
    };

    this.ensureTransporter();
    await this.transporter!.sendMail(mailOptions);
  }
}
