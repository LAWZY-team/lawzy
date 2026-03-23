import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { validatePassword } from '../../utils/password-validator';
import type { Response } from 'express';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    email: string,
    name: string,
    password: string,
    position: string,
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email,
      name,
      password: hashed,
      position,
    });
    return this.usersService.sanitize(user);
  }

  async requestRegistration(
    email: string,
    name: string,
    password: string,
    position: string,
  ) {
    const existing = await this.usersService.findByEmail(email);
    if (existing && existing.isVerified) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.message);
    }

    const otp = randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    if (existing && !existing.isVerified) {
      // Cập nhật lại user chưa verify với mã OTP mới thay vì tạo mới
      await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          password: hashed,
          position,
          otpCode: otp,
          otpExpires,
        },
      });
    } else {
      await this.usersService.create({
        email,
        name,
        password: hashed,
        position,
        otpCode: otp,
        otpExpires,
        isVerified: false,
      });
    }

    await this.emailService.sendOTPEmail(email, name, otp);

    return { message: 'Mã OTP đã được gửi đến email của bạn' };
  }

  async verifyOTP(email: string, otp: string) {
    const user = await this.usersService.findByEmailAndOTP(email, otp);
    if (!user) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpires: null,
      },
    });

    return this.usersService.sanitize(user);
  }

  async login(
    email: string,
    password: string,
    companyCode?: string,
  ): Promise<{ user: ReturnType<UsersService['sanitize']>; activeWorkspaceId?: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const sanitized = this.usersService.sanitize(user);

    if (companyCode?.trim()) {
      const code = companyCode.trim().toUpperCase();
      const workspace = await this.prisma.workspace.findFirst({
        where: { companyCode: code },
        include: {
          members: { where: { userId: user.id }, select: { id: true } },
        },
      });
      if (!workspace || workspace.members.length === 0) {
        throw new UnauthorizedException(
          'Mã công ty không hợp lệ hoặc bạn chưa được thêm vào workspace này',
        );
      }
      return { user: sanitized, activeWorkspaceId: workspace.id };
    }
    return { user: sanitized };
  }

  async loginWithGoogle(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google OAuth chưa được cấu hình');
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch {
      throw new UnauthorizedException('Token Google không hợp lệ');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Không thể xác thực thông tin từ Google');
    }

    const { sub: providerId, email, name, picture } = payload;

    let user = await this.usersService.findByProviderId('google', providerId);
    if (user) {
      return this.usersService.sanitize(user);
    }

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { provider: 'google', providerId, avatar: picture ?? undefined },
      });
      return this.usersService.sanitize(existingByEmail);
    }

    const randomPassword = randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(randomPassword, SALT_ROUNDS);
    user = await this.usersService.create({
      email,
      name: name ?? email.split('@')[0],
      password: hashed,
      provider: 'google',
      providerId,
      avatar: picture ?? undefined,
      isVerified: true,
    });
    return this.usersService.sanitize(user);
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_EXPIRES,
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
      },
    });

    return { accessToken, refreshToken };
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    });
    res.cookie('auth_session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    });
  }

  clearAuthCookies(res: Response) {
    const opts = { path: '/' } as const;
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
    res.clearCookie('auth_session', opts);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const stored = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });
      if (!stored || stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      await this.prisma.refreshToken.delete({ where: { id: stored.id } });

      return this.generateTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async revokeRefreshTokens(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async listSessions(userId: string, currentToken?: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, token: true, createdAt: true, expiresAt: true },
    });
    return tokens.map((t) => ({
      id: t.id,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      isCurrent: !!currentToken && t.token === currentToken,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new BadRequestException('Session not found');
    }
    await this.prisma.refreshToken.delete({ where: { id: sessionId } });
    return { message: 'Session revoked' };
  }

  async revokeOtherSessions(userId: string, keepToken?: string) {
    const where: { userId: string; NOT?: { token: string } } = { userId };
    if (keepToken) {
      where.NOT = { token: keepToken };
    }
    const result = await this.prisma.refreshToken.deleteMany({ where });
    return { message: 'Other sessions revoked', count: result.count };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Không có tài khoản trên hệ thống');
    }

    const token = randomBytes(32).toString('hex');
    // OTP / Token giới hạn trong 10 phút
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await this.usersService.setResetToken(email, token, expires);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(email, user.name, resetLink);

    return {
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.message);
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(user.id, hashed);
    await this.revokeRefreshTokens(user.id);

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      );
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.message);
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(user.id, hashed);
    await this.revokeRefreshTokens(user.id);

    return { message: 'Đổi mật khẩu thành công' };
  }
}
