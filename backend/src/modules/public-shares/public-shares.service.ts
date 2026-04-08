import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { getR2Env } from '../../config/env';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { sanitizeHtmlSafe } from '../../common/sanitize-html';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { PublicShareSnapshot } from './public-shares.types';
import { createHash, randomInt } from 'node:crypto';

const SHARE_PREFIX = 'shares/public/';

function makeToken(): string {
  return randomBytes(24).toString('base64url');
}

async function streamToString(body: unknown): Promise<string> {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  // AWS SDK in Node commonly returns Readable; fallback:
  return String(body);
}

@Injectable()
export class PublicSharesService {
  private readonly bucket = getR2Env().bucket;

  constructor(
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private makeAccessCode(): string {
    // 8 ký tự chữ-số, dễ đọc
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i += 1) {
      const idx = randomInt(0, chars.length);
      result += chars[idx];
    }
    return result;
  }

  private makeOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  async createSnapshot(params: {
    title?: string;
    html: string;
  }): Promise<{ token: string }> {
    const raw = (params.html ?? '').trim();
    if (!raw) {
      throw new Error('html is required');
    }
    const html = sanitizeHtmlSafe(raw);

    const token = makeToken();
    const key = `${SHARE_PREFIX}${token}.json`;
    const snapshot: PublicShareSnapshot = {
      ...(params.title ? { title: params.title } : {}),
      html,
      createdAt: new Date().toISOString(),
    };

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(snapshot),
        ContentType: 'application/json; charset=utf-8',
        CacheControl: 'no-store',
      }),
    );

    return { token };
  }

  async getSnapshot(token: string): Promise<PublicShareSnapshot | null> {
    const key = `${SHARE_PREFIX}${token}.json`;
    try {
      const obj = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const raw = await streamToString(obj.Body);
      if (!raw) return null;
      return JSON.parse(raw) as PublicShareSnapshot;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'NoSuchKey') return null;
      return null;
    }
  }

  /**
   * Tạo share mới: lưu snapshot + metadata, gửi email access code cho người nhận.
   */
  async createShareWithAccessCode(params: {
    title?: string;
    html: string;
    recipientEmail: string;
    createdByUserId?: string;
  }): Promise<{ token: string; accessCode: string }> {
    const recipientEmail = params.recipientEmail.trim().toLowerCase();
    if (!recipientEmail) {
      throw new BadRequestException('recipientEmail is required');
    }

    const { token } = await this.createSnapshot({
      title: params.title,
      html: params.html,
    });

    const snapshotKey = `${SHARE_PREFIX}${token}.json`;
    const accessCode = this.makeAccessCode();
    const accessCodeHash = this.hashValue(accessCode);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày, có thể điều chỉnh sau

    await this.prisma.publicShare.create({
      data: {
        token,
        accessCodeHash,
        recipientEmail,
        title: params.title ?? null,
        snapshotKey,
        createdBy: params.createdByUserId ?? null,
        expiresAt,
        isActive: true,
      },
    });

    // Gửi email access code cho người nhận
    await this.emailService.sendPublicShareAccessEmail({
      toEmail: recipientEmail,
      title: params.title ?? 'Hợp đồng',
      accessCode,
      shareUrlToken: token,
    });

    return { token, accessCode };
  }

  /**
   * Request OTP: kiểm tra email + accessCode, tạo OTP và gửi email.
   */
  async requestOtpForShare(params: {
    token: string;
    email: string;
    accessCode: string;
  }): Promise<void> {
    const token = params.token.trim();
    const email = params.email.trim().toLowerCase();
    const accessCode = params.accessCode.trim();

    const share = await this.prisma.publicShare.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    if (!share) {
      throw new UnauthorizedException('Link chia sẻ không còn hiệu lực');
    }

    const codeHash = this.hashValue(accessCode);
    if (codeHash !== share.accessCodeHash || email !== share.recipientEmail.toLowerCase()) {
      throw new UnauthorizedException('Email hoặc mã truy cập không đúng');
    }

    const otp = this.makeOtp();
    const otpHash = this.hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await this.prisma.publicShareOtp.create({
      data: {
        shareId: share.id,
        email,
        otpHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    await this.emailService.sendPublicShareOtpEmail({
      toEmail: email,
      title: share.title ?? 'Hợp đồng',
      otp,
    });
  }

  /**
   * Verify OTP và tạo session 24h, trả về sessionToken để set cookie ở controller.
   */
  async verifyOtpAndCreateSession(params: {
    token: string;
    email: string;
    otp: string;
  }): Promise<{ sessionToken: string }> {
    const token = params.token.trim();
    const email = params.email.trim().toLowerCase();
    const otp = params.otp.trim();

    const share = await this.prisma.publicShare.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    if (!share) {
      throw new UnauthorizedException('Link chia sẻ không còn hiệu lực');
    }

    const otpRecords = await this.prisma.publicShareOtp.findMany({
      where: {
        shareId: share.id,
        email,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    if (!otpRecords.length) {
      throw new UnauthorizedException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const latest = otpRecords[0];
    if (latest.consumedAt) {
      throw new UnauthorizedException('OTP đã được sử dụng');
    }

    const otpHash = this.hashValue(otp);
    if (otpHash !== latest.otpHash) {
      await this.prisma.publicShareOtp.update({
        where: { id: latest.id },
        data: {
          attemptCount: latest.attemptCount + 1,
        },
      });
      throw new UnauthorizedException('OTP không đúng');
    }

    await this.prisma.publicShareOtp.update({
      where: { id: latest.id },
      data: { consumedAt: new Date() },
    });

    const sessionTokenRaw = makeToken();
    const sessionTokenHash = this.hashValue(sessionTokenRaw);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.prisma.publicShareSession.create({
      data: {
        shareId: share.id,
        email,
        sessionTokenHash,
        expiresAt,
      },
    });

    return { sessionToken: sessionTokenRaw };
  }

  /**
   * Kiểm tra session và trả snapshot nếu hợp lệ.
   */
  async getSnapshotWithSession(params: {
    token: string;
    sessionToken: string | null;
  }): Promise<PublicShareSnapshot | null> {
    const token = params.token.trim();
    const sessionToken = params.sessionToken?.trim();

    const share = await this.prisma.publicShare.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    if (!share) {
      throw new UnauthorizedException('Link chia sẻ không còn hiệu lực');
    }

    if (!sessionToken) {
      throw new UnauthorizedException('Chưa xác thực để xem nội dung');
    }

    const sessionHash = this.hashValue(sessionToken);
    const session = await this.prisma.publicShareSession.findFirst({
      where: {
        shareId: share.id,
        sessionTokenHash: sessionHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Phiên truy cập đã hết hạn hoặc không hợp lệ');
    }

    // Dùng token để đọc snapshot như cũ
    const snap = await this.getSnapshot(token);
    if (!snap) {
      throw new UnauthorizedException('Không tìm thấy nội dung chia sẻ');
    }
    return snap;
  }
}
