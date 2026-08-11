import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { LawfirmScanService } from './lawfirm-scan.service';
import { LawfirmTemplateSetIndexService } from './lawfirm-template-set-index.service';
import { LawfirmR2Helper } from './utils/lawfirm-r2.helper';

const WORKER_CONCURRENCY = 3;
const LEASE_DURATION_MS = 2 * 60 * 1000;

@Injectable()
export class LawfirmTemplateScanWorkerService {
  private readonly logger = new Logger(LawfirmTemplateScanWorkerService.name);
  private readonly workerId = `lawfirm-${randomUUID()}`;
  private tickInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanService: LawfirmScanService,
    private readonly templateSetIndex: LawfirmTemplateSetIndexService,
    private readonly r2Helper: LawfirmR2Helper,
  ) {}

  @Interval(1000)
  async tick(): Promise<void> {
    if (this.tickInProgress) return;
    this.tickInProgress = true;
    try {
      await Promise.all(
        Array.from({ length: WORKER_CONCURRENCY }, () => this.processNext()),
      );
    } finally {
      this.tickInProgress = false;
    }
  }

  private async processNext(): Promise<void> {
    const job = await this.claimNext();
    if (!job) return;
    try {
      if (job.kind === 'parse_document') {
        await this.processParseJob(job);
        return;
      }
      if (job.kind === 'index_template_set') {
        await this.processIndexJob(job);
        return;
      }
      throw new Error(`Unsupported template scan job kind: ${job.kind}`);
    } catch (error: unknown) {
      await this.handleFailure(job, error);
    }
  }

  private async claimNext() {
    for (
      let claimAttempt = 0;
      claimAttempt < WORKER_CONCURRENCY;
      claimAttempt += 1
    ) {
      const now = new Date();
      const claimable = {
        OR: [
          { status: 'queued', availableAt: { lte: now } },
          { status: 'processing', leaseExpiresAt: { lt: now } },
        ],
      } satisfies Prisma.LawfirmTemplateScanJobWhereInput;
      const candidate = await this.prisma.lawfirmTemplateScanJob.findFirst({
        where: claimable,
        orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      if (!candidate) return null;

      const claimed = await this.prisma.lawfirmTemplateScanJob.updateMany({
        where: { id: candidate.id, ...claimable },
        data: {
          status: 'processing',
          leaseOwner: this.workerId,
          leaseExpiresAt: new Date(now.getTime() + LEASE_DURATION_MS),
          attempts: { increment: 1 },
          startedAt: now,
        },
      });
      if (claimed.count !== 1) continue;
      return this.prisma.lawfirmTemplateScanJob.findUnique({
        where: { id: candidate.id },
        include: { uploadSession: true, document: true },
      });
    }
    return null;
  }

  private async processParseJob(
    job: NonNullable<Awaited<ReturnType<typeof this.claimNext>>>,
  ) {
    if (!job.document) throw new Error('Parse job has no document');
    const buffer = await this.r2Helper.downloadBuffer(job.document.storageKey);
    const analysis = await this.scanService.analyzeUploadedTemplateFile({
      buffer,
      mimeType:
        job.document.fileType === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: job.document.fileName,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.lawfirmTemplateField.deleteMany({
        where: { documentId: job.documentId! },
      });
      await tx.lawfirmTemplateDocument.update({
        where: { id: job.documentId! },
        data: {
          fileType: analysis.fileType,
          plainText: analysis.plainText,
          status: 'draft',
          fields: {
            create: analysis.fields.map((field, index) => ({
              label: field.label,
              placeholder: field.placeholder,
              mappedKey: field.mappedKey,
              source: 'auto',
              count: field.count,
              sortOrder: index,
            })),
          },
        },
      });
      const completed = await tx.lawfirmTemplateScanJob.updateMany({
        where: { id: job.id, status: 'processing', leaseOwner: this.workerId },
        data: {
          status: 'completed',
          result: {
            fieldCount: analysis.fields.length,
            textLength: analysis.plainText.length,
          },
          errorMessage: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      });
      if (completed.count === 1) {
        await tx.lawfirmTemplateUploadSession.update({
          where: { id: job.uploadSessionId },
          data: {
            status:
              job.uploadSession.status === 'queued' ? 'processing' : undefined,
            processedDocuments: { increment: 1 },
          },
        });
      }
    });
  }

  private async processIndexJob(
    job: NonNullable<Awaited<ReturnType<typeof this.claimNext>>>,
  ) {
    const pendingParsers = await this.prisma.lawfirmTemplateScanJob.count({
      where: {
        uploadSessionId: job.uploadSessionId,
        kind: 'parse_document',
        status: { in: ['uploading', 'queued', 'processing'] },
      },
    });
    if (pendingParsers > 0) {
      await this.prisma.lawfirmTemplateScanJob.updateMany({
        where: { id: job.id, status: 'processing', leaseOwner: this.workerId },
        data: {
          status: 'queued',
          attempts: { decrement: 1 },
          availableAt: new Date(Date.now() + 1000),
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      return;
    }

    const result = await this.templateSetIndex.rebuild(
      job.uploadSession.templateSetId,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.lawfirmTemplateScanJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          result: result as unknown as Prisma.InputJsonValue,
          errorMessage: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      });
      await tx.lawfirmTemplateUploadSession.update({
        where: { id: job.uploadSessionId },
        data: {
          status:
            job.uploadSession.failedDocuments > 0
              ? 'partial_failed'
              : 'review_ready',
          completedAt: new Date(),
        },
      });
    });
  }

  private async handleFailure(
    job: NonNullable<Awaited<ReturnType<typeof this.claimNext>>>,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Template scan job ${job.id} failed: ${message}`);
    if (job.attempts < job.maxAttempts) {
      const delayMs = Math.min(
        30_000,
        1000 * 2 ** Math.max(0, job.attempts - 1),
      );
      await this.prisma.lawfirmTemplateScanJob.updateMany({
        where: { id: job.id, status: 'processing', leaseOwner: this.workerId },
        data: {
          status: 'queued',
          availableAt: new Date(Date.now() + delayMs),
          errorMessage: message,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const failed = await tx.lawfirmTemplateScanJob.updateMany({
        where: { id: job.id, status: 'processing', leaseOwner: this.workerId },
        data: {
          status: 'failed',
          errorMessage: message,
          leaseOwner: null,
          leaseExpiresAt: null,
          completedAt: new Date(),
        },
      });
      if (failed.count !== 1) return;
      if (job.kind === 'parse_document') {
        if (job.documentId) {
          await tx.lawfirmTemplateDocument.update({
            where: { id: job.documentId },
            data: { status: 'failed' },
          });
        }
        await tx.lawfirmTemplateUploadSession.update({
          where: { id: job.uploadSessionId },
          data: { failedDocuments: { increment: 1 } },
        });
      } else {
        await tx.lawfirmTemplateUploadSession.update({
          where: { id: job.uploadSessionId },
          data: { status: 'failed', completedAt: new Date() },
        });
      }
    });
  }
}
