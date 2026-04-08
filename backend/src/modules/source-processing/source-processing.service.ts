import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3Client, type GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { s3SendWithRetry } from '../../integrations/r2/s3-send-with-retry';
import { getR2Env } from '../../config/env';
import { PdfExtractor } from './extractors/pdf.extractor';
import { DocxExtractor } from './extractors/docx.extractor';
import { TextExtractor } from './extractors/text.extractor';
import { UrlExtractor } from './extractors/url.extractor';
import { OcrExtractor } from './extractors/ocr.extractor';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class SourceProcessingService {
  private readonly logger = new Logger(SourceProcessingService.name);
  private readonly bucket = getR2Env().bucket;
  /**
   * Chain jobs per sourceId so concurrent reprocess calls serialize (avoids Prisma deadlocks).
   */
  private readonly processChain = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfExtractor: PdfExtractor,
    private readonly docxExtractor: DocxExtractor,
    private readonly textExtractor: TextExtractor,
    private readonly urlExtractor: UrlExtractor,
    private readonly ocrExtractor: OcrExtractor,
    private readonly chunker: ChunkerService,
    private readonly embedding: EmbeddingService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client,
  ) {}

  /**
   * Full async processing pipeline for a source:
   * 1. Extract text
   * 2. Chunk
   * 3. Embed
   * 4. Store chunks + update source
   */
  async processSource(sourceId: string): Promise<void> {
    const prev = this.processChain.get(sourceId) ?? Promise.resolve();
    const next = prev.then(
      () => this.runProcessSource(sourceId),
      () => this.runProcessSource(sourceId),
    );
    this.processChain.set(sourceId, next);
    try {
      await next;
    } finally {
      if (this.processChain.get(sourceId) === next) {
        this.processChain.delete(sourceId);
      }
    }
  }

  private async runProcessSource(sourceId: string): Promise<void> {
    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      this.logger.warn(`Source ${sourceId} not found, skipping`);
      return;
    }

    try {
      await this.prisma.source.update({
        where: { id: sourceId },
        data: { status: 'processing', processingError: null },
      });

      const { text, pageCount } = await this.extractText(source);

      if (!text || text.trim().length === 0) {
        await this.prisma.source.update({
          where: { id: sourceId },
          data: {
            status: 'error',
            processingError: 'No text could be extracted from this source',
          },
        });
        return;
      }

      await this.prisma.source.update({
        where: { id: sourceId },
        data: { content: text, pageCount },
      });

      const { parentChunks } = this.chunker.chunk(text);

      const allChildTexts: string[] = [];
      const childMapping: Array<{ parentIdx: number; childIdx: number }> = [];

      for (let pIdx = 0; pIdx < parentChunks.length; pIdx++) {
        const parent = parentChunks[pIdx];
        for (const child of parent.children) {
          allChildTexts.push(child.content);
          childMapping.push({ parentIdx: pIdx, childIdx: child.chunkIndex });
        }
      }

      let embeddings: number[][] = [];
      try {
        embeddings = await this.embedding.embedBatch(allChildTexts);
      } catch (err) {
        this.logger.warn(
          `Embedding failed for source ${sourceId}, storing without vectors: ${err}`,
        );
        embeddings = allChildTexts.map(() => []);
      }

      const totalChunks = parentChunks.reduce(
        (sum, p) => sum + p.children.length,
        0,
      );

      const embeddingByChildKey = new Map<string, number[]>();
      for (let i = 0; i < childMapping.length; i++) {
        const m = childMapping[i];
        embeddingByChildKey.set(
          `${m.parentIdx}:${m.childIdx}`,
          embeddings[i] ?? [],
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.sourceChunk.deleteMany({
          where: { sourceId },
        });

        for (let pIdx = 0; pIdx < parentChunks.length; pIdx++) {
          const parent = parentChunks[pIdx];

          const parentRecord = await tx.sourceChunk.create({
            data: {
              sourceId,
              content: parent.content,
              chunkIndex: parent.chunkIndex,
              tokenCount: parent.tokenCount,
              pageNumber: parent.pageNumber ?? null,
              metadata: { type: 'parent' },
            },
          });

          for (const child of parent.children) {
            const vec = embeddingByChildKey.get(`${pIdx}:${child.chunkIndex}`);
            const embeddingVector = vec && vec.length > 0 ? vec : null;

            await tx.sourceChunk.create({
              data: {
                sourceId,
                parentId: parentRecord.id,
                content: child.content,
                chunkIndex: child.chunkIndex,
                tokenCount: child.tokenCount,
                pageNumber: child.pageNumber ?? null,
                embedding: embeddingVector ?? Prisma.DbNull,
                metadata: { type: 'child' },
              },
            });
          }
        }

        await tx.source.update({
          where: { id: sourceId },
          data: {
            status: 'completed',
            chunkCount: totalChunks,
            processingError: null,
          },
        });
      });

      this.logger.log(
        `Source ${sourceId} processed: ${pageCount} pages, ${totalChunks} chunks`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to process source ${sourceId}: ${message}`);
      await this.prisma.source.update({
        where: { id: sourceId },
        data: { status: 'error', processingError: message },
      });
    }
  }

  private async extractText(source: {
    type: string;
    s3Key: string | null;
    sourceUrl: string | null;
  }): Promise<{ text: string; pageCount: number }> {
    if (source.type === 'url' && source.sourceUrl) {
      return this.urlExtractor.extract(source.sourceUrl);
    }

    if (!source.s3Key) {
      throw new Error('Source has no S3 key and no URL');
    }

    const s3Params = { s3: this.s3, bucket: this.bucket, key: source.s3Key };

    let result: { text: string; pageCount: number };

    switch (source.type) {
      case 'pdf':
        result = await this.pdfExtractor.extractFromS3(s3Params);
        break;
      case 'docx':
      case 'doc':
        result = await this.docxExtractor.extractFromS3(s3Params);
        break;
      case 'txt':
      case 'text':
        result = await this.textExtractor.extractFromS3(s3Params);
        break;
      default:
        result = await this.pdfExtractor.extractFromS3(s3Params);
        break;
    }

    if (source.type === 'pdf' && this.ocrExtractor.needsOcr(result.text)) {
      this.logger.log(
        `PDF text extraction yielded minimal text (${result.text.length} chars), attempting OCR...`,
      );
      try {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const response = (await s3SendWithRetry(
          this.s3,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: source.s3Key,
          }),
        )) as GetObjectCommandOutput;
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const ocrResult = await this.ocrExtractor.ocrFromBuffer(buffer);
        if (ocrResult.text.length > result.text.length) {
          this.logger.log(
            `OCR produced ${ocrResult.text.length} chars (confidence: ${ocrResult.confidence}%)`,
          );
          result = {
            text: ocrResult.text,
            pageCount: result.pageCount,
          };
        }
      } catch (ocrErr) {
        this.logger.warn(`OCR fallback failed: ${ocrErr}`);
      }
    }

    return result;
  }
}
