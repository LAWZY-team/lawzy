import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PublicSharesService } from './public-shares.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function assertToken(token: string): string {
  const t = (token ?? '').trim();
  // base64url token (crypto.randomBytes().toString('base64url'))
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(t)) {
    throw new BadRequestException('Invalid token');
  }
  return t;
}

@Controller('public-shares')
export class PublicSharesController {
  constructor(private readonly service: PublicSharesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: { title?: string; html?: string }) {
    const title = body.title != null ? String(body.title).trim() : undefined;
    const html = body.html != null ? String(body.html) : '';
    try {
      return await this.service.createSnapshot({
        title: title || undefined,
        html,
      });
    } catch (e: unknown) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid request',
      );
    }
  }

  /**
   * Tạo share mới với mã truy cập cố định + gửi email.
   * Sử dụng riêng cho luồng mới, tránh ảnh hưởng bên cũ.
   */
  @Post('with-access-code')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  async createWithAccessCode(
    @Req() req: Request,
    @Body()
    body: {
      title?: string;
      html?: string;
      recipientEmail: string;
    },
  ) {
    const title = body.title != null ? String(body.title).trim() : undefined;
    const html = body.html != null ? String(body.html) : '';
    const recipientEmail = String(body.recipientEmail ?? '').trim();
    if (!recipientEmail) {
      throw new BadRequestException('recipientEmail is required');
    }

    try {
      const userId = (req as any).user?.userId as string | undefined;
      return await this.service.createShareWithAccessCode({
        title: title || undefined,
        html,
        recipientEmail,
        createdByUserId: userId,
      });
    } catch (e: unknown) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid request',
      );
    }
  }

  @Post(':token/request-otp')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async requestOtp(
    @Param('token') tokenRaw: string,
    @Body() body: { email: string; accessCode: string },
  ) {
    const token = assertToken(tokenRaw);
    await this.service.requestOtpForShare({
      token,
      email: body.email,
      accessCode: body.accessCode,
    });
    return { success: true };
  }

  @Post(':token/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async verifyOtp(
    @Param('token') tokenRaw: string,
    @Body() body: { email: string; otp: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = assertToken(tokenRaw);
    const { sessionToken } = await this.service.verifyOtpAndCreateSession({
      token,
      email: body.email,
      otp: body.otp,
    });

    // Set cookie session cho public share, 24h
    res.cookie('public_share_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { success: true };
  }

  @Get(':token/content')
  @Header('Cache-Control', 'no-store')
  async getContent(@Param('token') tokenRaw: string, @Req() req: Request) {
    const token = assertToken(tokenRaw);
    const sessionToken = req.cookies?.public_share_session ?? null;
    const snap = await this.service.getSnapshotWithSession({
      token,
      sessionToken,
    });
    if (!snap) throw new NotFoundException('Share not found');
    return snap;
  }

  /**
   * Giữ endpoint cũ nhưng không trả nội dung nữa để tránh lộ công khai.
   */
  @Get(':token')
  @Header('Cache-Control', 'no-store')
  async legacyGet() {
    throw new NotFoundException('Share not found');
  }
}
