import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        'SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
      );
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
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(
        `Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    const mailOptions = {
      from: 'contact@lawzy.vn',
      to: email,
      subject: 'Đặt lại mật khẩu Lawzy',
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
            .button { display: inline-block; padding: 12px 30px; background-color: #f54900; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <h1 style="font-size: 20px; color: #333; text-align: center;">Đặt lại mật khẩu</h1>
              <p>Xin chào <strong>${name}</strong>,</p>
              <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
              <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
              </div>
              <p>Hiệu lực trong <strong>1 giờ</strong>.</p>
              <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
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
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(
        `Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    await this.transporter.sendMail(mailOptions);
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

    await this.transporter.sendMail(mailOptions);
  }
}
