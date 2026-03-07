import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    password: string;
    roles?: string[];
    otpCode?: string;
    otpExpires?: Date;
    isVerified?: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        roles: JSON.stringify(data.roles ?? ['user']),
        otpCode: data.otpCode,
        otpExpires: data.otpExpires,
        isVerified: data.isVerified ?? false,
      },
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; avatar?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async setResetToken(
    email: string,
    token: string,
    expires: Date,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: { resetToken: token, resetExpires: expires },
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpires: { gt: new Date() },
      },
    });
  }

  async updatePassword(id: string, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password, resetToken: null, resetExpires: null },
    });
  }

  async setOTP(email: string, otp: string, expires: Date): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data: { otpCode: otp, otpExpires: expires },
    });
  }

  async findByEmailAndOTP(email: string, otp: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        otpCode: otp,
        otpExpires: { gt: new Date() },
      },
    });
  }

  sanitize(user: User) {
    const { password, resetToken, resetExpires, otpCode, otpExpires, ...safe } = user;
    return {
      ...safe,
      roles: typeof safe.roles === 'string' ? JSON.parse(safe.roles as string) : safe.roles,
    };
  }
}
