import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import * as mammoth from 'mammoth';
import { s3SendWithRetry } from '../../../integrations/r2/s3-send-with-retry';

interface ExtractionResult {
  text: string;
  pageCount: number;
}

@Injectable()
export class DocxExtractor {
  private readonly logger = new Logger(DocxExtractor.name);

  async extract(buffer: Buffer): Promise<ExtractionResult> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() || '';
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount: estimatedPages };
  }

  async extractFromS3({
    s3,
    bucket,
    key,
  }: {
    s3: S3Client;
    bucket: string;
    key: string;
  }): Promise<ExtractionResult> {
    const response = (await s3SendWithRetry(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    )) as GetObjectCommandOutput;
    const bodyStream = response.Body;
    if (!bodyStream) {
      throw new Error(`Empty body for S3 key: ${key}`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of bodyStream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return this.extract(Buffer.concat(chunks));
  }
}
