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
}
