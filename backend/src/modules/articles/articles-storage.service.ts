import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { getR2Env, isR2Configured } from '../../config/env';

const ARTICLES_IMAGE_PREFIX = 'articles/images/';
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ArticlesStorageService {
  constructor(@Inject(R2_S3_CLIENT) private readonly s3: S3Client | null) {}

  private ensureClient(): S3Client {
    if (!isR2Configured() || !this.s3) {
      throw new BadRequestException('File storage is not configured');
    }
    return this.s3;
  }

  private getBucket(): string {
    return getR2Env().bucket;
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype || '')) {
      throw new BadRequestException(
        `Invalid image type. Allowed: ${ALLOWED_MIMES.join(', ')}`,
      );
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException(
        `File too large. Max ${MAX_SIZE / 1024 / 1024}MB`,
      );
    }

    const ext = (file.mimetype?.split('/')[1] || 'jpg').replace(/jpeg/, 'jpg');
    const key = `${ARTICLES_IMAGE_PREFIX}${randomUUID()}.${ext}`;
    const client = this.ensureClient();
    const bucket = this.getBucket();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'image/jpeg',
      }),
    );

    return {
      key,
      url: `/api/proxy/articles/serve-image?k=${encodeURIComponent(key)}`,
    };
  }

  async getImageStream(key: string): Promise<{
    body: NodeJS.ReadableStream;
    contentType: string;
  }> {
    const client = this.ensureClient();
    const bucket = this.getBucket();

    if (!key.startsWith(ARTICLES_IMAGE_PREFIX)) {
      throw new BadRequestException('Invalid image key');
    }

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    return {
      body: response.Body as NodeJS.ReadableStream,
      contentType: (response.ContentType as string) || 'image/jpeg',
    };
  }
}
