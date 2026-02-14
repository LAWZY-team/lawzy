import { Inject, Injectable } from '@nestjs/common';
import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { getR2Env } from '../../config/env';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import type { PublicShareSnapshot } from './public-shares.types';

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

  constructor(@Inject(R2_S3_CLIENT) private readonly s3: S3Client) {}

  async createSnapshot(params: { title?: string; html: string }): Promise<{ token: string }> {
    const html = (params.html ?? '').trim();
    if (!html) {
      // Keep behavior simple; controller will map this to 400
      throw new Error('html is required');
    }

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
}

