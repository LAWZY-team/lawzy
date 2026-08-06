import { Inject, Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { getR2Env } from '../../../config/env';
import { R2_S3_CLIENT } from '../../../integrations/r2/r2.constants';

const MAX_S3_KEY_LENGTH = 191;

@Injectable()
export class LawfirmR2Helper {
  constructor(@Inject(R2_S3_CLIENT) private readonly s3: S3Client | null) {}

  private ensureClient(): S3Client {
    if (!this.s3) {
      throw new Error('R2/S3 is not configured');
    }
    return this.s3;
  }

  private getBucket(): string {
    return getR2Env().bucket;
  }

  private truncateForS3Key(name: string, maxLen: number): string {
    if (!name || name.length <= maxLen) return name;
    const lastDot = name.lastIndexOf('.');
    const hasExt = lastDot > 0 && lastDot < name.length - 1;
    if (!hasExt) return name.slice(0, maxLen);
    const ext = name.slice(lastDot);
    const base = name.slice(0, lastDot);
    const keepBaseLen = Math.max(1, maxLen - ext.length);
    return `${base.slice(0, keepBaseLen)}${ext}`;
  }

  async uploadBuffer(params: {
    workspaceId: string;
    userId: string;
    fileName: string;
    buffer: Buffer;
    mimeType: string;
    category?: string;
  }): Promise<string> {
    const client = this.ensureClient();
    const bucket = this.getBucket();
    const uuid = randomUUID();
    const safeName = params.fileName
      .replace(/[^a-zA-Z0-9._\u00C0-\u024F\s-]/g, '_')
      .trim();
    const prefix = `lawfirm/${params.workspaceId}/${params.userId}/${params.category ?? 'export'}/${uuid}-`;
    const maxNameLen = Math.max(1, MAX_S3_KEY_LENGTH - prefix.length);
    let key = `${prefix}${this.truncateForS3Key(safeName, maxNameLen)}`;
    if (key.length > MAX_S3_KEY_LENGTH) {
      key = `lawfirm/${params.workspaceId}/${params.userId}/${uuid}`;
    }
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
      }),
    );
    return key;
  }

  async downloadBuffer(storageKey: string): Promise<Buffer> {
    const client = this.ensureClient();
    const bucket = this.getBucket();
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
    );
    if (!response.Body) {
      throw new Error(`Object not found: ${storageKey}`);
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
