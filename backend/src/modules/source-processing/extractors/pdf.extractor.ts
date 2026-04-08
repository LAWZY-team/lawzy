import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { s3SendWithRetry } from '../../../integrations/r2/s3-send-with-retry';
import { extractTextFromPdfBuffer } from './parse-pdf-buffer';

interface ExtractionResult {
  text: string;
  pageCount: number;
}

@Injectable()
export class PdfExtractor {
  private readonly logger = new Logger(PdfExtractor.name);

  async extract(buffer: Buffer): Promise<ExtractionResult> {
    return extractTextFromPdfBuffer(buffer);
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
    const buffer = Buffer.concat(chunks);
    return this.extract(buffer);
  }
}
