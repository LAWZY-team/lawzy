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

  async register(email: string, name: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email,
      name,
      password: hashed,
    });
    return this.usersService.sanitize(user);
  }

  async requestRegistration(email: string, name: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(passwordValidation.message);
    }

    const otp = randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await this.usersService.create({
      email,
      name,
      password: hashed,
      otpCode: otp,
      otpExpires,
      isVerified: false,
    });

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

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu' };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.setResetToken(email, token, expires);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
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
}
