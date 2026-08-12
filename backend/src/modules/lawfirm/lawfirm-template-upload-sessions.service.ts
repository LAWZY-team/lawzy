import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { FilesService } from '../files/files.service';
import { CreateTemplateUploadSessionDto } from './dto/template-upload-session.dto';
import { LawfirmScanService } from './lawfirm-scan.service';
import { LAWFIRM_PDF_MIME, LAWFIRM_TEMPLATE_MIMES } from './lawfirm.constants';
import { mapWithConcurrency } from './utils/bounded-concurrency';

const MAX_SESSION_DOCUMENTS = 20;
const UPLOAD_CONCURRENCY = 3;

@Injectable()
export class LawfirmTemplateUploadSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly filesService: FilesService,
    private readonly scanService: LawfirmScanService,
  ) {}

  async create(userId: string, dto: CreateTemplateUploadSessionDto) {
    const templateSet = await this.prisma.lawfirmTemplateSet.findUnique({
      where: { id: dto.templateSetId },
      select: { id: true, workspaceId: true },
    });
    if (!templateSet) throw new NotFoundException('Template set not found');
    await this.workspaceAccess.requireMembership(
      templateSet.workspaceId,
      userId,
    );

    const clientKey = dto.idempotencyKey?.trim() || randomUUID();
    const idempotencyKey = `template-upload:${templateSet.id}:${clientKey}`;
    const existing = await this.prisma.lawfirmTemplateUploadSession.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return this.serialize(existing);

    try {
      const session = await this.prisma.lawfirmTemplateUploadSession.create({
        data: {
          templateSetId: templateSet.id,
          createdBy: userId,
          idempotencyKey,
        },
      });
      return this.serialize(session);
    } catch (error: unknown) {
      const raced = await this.prisma.lawfirmTemplateUploadSession.findUnique({
        where: { idempotencyKey },
      });
      if (raced) return this.serialize(raced);
      throw error;
    }
  }

  async addDocuments(
    userId: string,
    sessionId: string,
    files: Express.Multer.File[],
  ) {
    const session = await this.requireWritableSession(userId, sessionId);
    if (!files.length) throw new BadRequestException('No files provided');
    if (session.totalDocuments + files.length > MAX_SESSION_DOCUMENTS) {
      throw new BadRequestException(
        `A template upload session supports at most ${MAX_SESSION_DOCUMENTS} documents`,
      );
    }
    for (const file of files) {
      this.scanService.validateMimeAndSize(
        file.mimetype,
        file.size,
        LAWFIRM_TEMPLATE_MIMES,
      );
    }
    const storage = await this.filesService.getStorageUsed(
      session.templateSet.workspaceId,
      userId,
    );
    const batchBytes = files.reduce((total, file) => total + file.size, 0);
    if (storage.bytes + batchBytes > storage.limitBytes) {
      throw new BadRequestException(
        `Storage limit exceeded. Used: ${storage.bytes} bytes, batch: ${batchBytes} bytes, limit: ${storage.limitBytes} bytes.`,
      );
    }

    const lastDocument = await this.prisma.lawfirmTemplateDocument.findFirst({
      where: { templateSetId: session.templateSetId },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' },
    });
    const baseSortOrder = (lastDocument?.sortOrder ?? -1) + 1;
    const documents = await mapWithConcurrency(
      files,
      UPLOAD_CONCURRENCY,
      (file, index) =>
        this.reserveAndUploadFile(userId, session, file, baseSortOrder + index),
    );
    return {
      session_id: sessionId,
      documents,
      concurrency: UPLOAD_CONCURRENCY,
    };
  }

  async finalize(userId: string, sessionId: string) {
    const session = await this.requireSession(userId, sessionId);
    if (['review_ready', 'partial_failed'].includes(session.status)) {
      return this.getStatus(userId, sessionId);
    }
    if (!['receiving', 'queued', 'processing'].includes(session.status)) {
      throw new ConflictException(`Upload session is ${session.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lawfirmTemplateUploadSession.updateMany({
        where: { id: sessionId, status: 'receiving' },
        data: { status: 'queued', finalizedAt: new Date() },
      });
      await tx.lawfirmTemplateScanJob.upsert({
        where: { idempotencyKey: `template-index:${sessionId}` },
        create: {
          uploadSessionId: sessionId,
          kind: 'index_template_set',
          status: 'queued',
          idempotencyKey: `template-index:${sessionId}`,
          maxAttempts: 5,
        },
        update: {},
      });
    });
    return this.getStatus(userId, sessionId);
  }

  async getStatus(userId: string, sessionId: string) {
    const session = await this.requireSession(userId, sessionId);
    const [documents, jobs] = await Promise.all([
      this.prisma.lawfirmTemplateDocument.findMany({
        where: { uploadSessionId: sessionId },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          status: true,
          sortOrder: true,
          updatedAt: true,
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.lawfirmTemplateScanJob.groupBy({
        by: ['kind', 'status'],
        where: { uploadSessionId: sessionId },
        _count: { _all: true },
      }),
    ]);
    return {
      ...this.serialize(session),
      progress: {
        total: session.totalDocuments,
        processed: session.processedDocuments,
        failed: session.failedDocuments,
        pending: Math.max(
          0,
          session.totalDocuments -
            session.processedDocuments -
            session.failedDocuments,
        ),
      },
      documents: documents.map((document) => ({
        id: document.id,
        file_name: document.fileName,
        file_type: document.fileType,
        status: document.status,
        sort_order: document.sortOrder,
        updated_at: document.updatedAt.toISOString(),
      })),
      jobs: jobs.map((job) => ({
        kind: job.kind,
        status: job.status,
        count: job._count._all,
      })),
    };
  }

  private async reserveAndUploadFile(
    userId: string,
    session: {
      id: string;
      templateSetId: string;
      templateSet: { workspaceId: string };
    },
    file: Express.Multer.File,
    sortOrder: number,
  ) {
    const fingerprint = createHash('sha256').update(file.buffer).digest('hex');
    const idempotencyKey = `template-parse:${session.id}:${fingerprint}`;
    const existing = await this.prisma.lawfirmTemplateScanJob.findUnique({
      where: { idempotencyKey },
      include: { document: true },
    });
    if (existing) {
      return {
        document_id: existing.documentId,
        job_id: existing.id,
        status: existing.status,
        reused: true,
      };
    }

    let job: { id: string };
    try {
      job = await this.prisma.$transaction(async (tx) => {
        const accepted = await tx.lawfirmTemplateUploadSession.updateMany({
          where: {
            id: session.id,
            status: 'receiving',
            totalDocuments: { lt: MAX_SESSION_DOCUMENTS },
          },
          data: { totalDocuments: { increment: 1 } },
        });
        if (accepted.count !== 1) {
          throw new ConflictException('Upload session is already finalized');
        }
        return tx.lawfirmTemplateScanJob.create({
          data: {
            uploadSessionId: session.id,
            kind: 'parse_document',
            status: 'uploading',
            idempotencyKey,
            contentFingerprint: fingerprint,
          },
          select: { id: true },
        });
      });
    } catch (error: unknown) {
      const raced = await this.prisma.lawfirmTemplateScanJob.findUnique({
        where: { idempotencyKey },
      });
      if (raced) {
        return {
          document_id: raced.documentId,
          job_id: raced.id,
          status: raced.status,
          reused: true,
        };
      }
      throw error;
    }

    try {
      const uploaded = await this.filesService.upload({
        file,
        userId,
        workspaceId: session.templateSet.workspaceId,
        category: 'template',
      });
      const document = await this.prisma.$transaction(async (tx) => {
        const created = await tx.lawfirmTemplateDocument.create({
          data: {
            templateSetId: session.templateSetId,
            uploadSessionId: session.id,
            fileName: uploaded.name,
            fileType: this.inferFileType(file),
            status: 'queued',
            storageKey: uploaded.s3Key,
            fileId: uploaded.id,
            sortOrder,
          },
        });
        await tx.lawfirmTemplateScanJob.update({
          where: { id: job.id },
          data: {
            documentId: created.id,
            status: 'queued',
            availableAt: new Date(),
          },
        });
        return created;
      });
      return {
        document_id: document.id,
        job_id: job.id,
        status: 'queued',
        reused: false,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.$transaction([
        this.prisma.lawfirmTemplateScanJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            errorMessage: message,
            completedAt: new Date(),
          },
        }),
        this.prisma.lawfirmTemplateUploadSession.update({
          where: { id: session.id },
          data: { failedDocuments: { increment: 1 } },
        }),
      ]);
      throw error;
    }
  }

  private inferFileType(file: Express.Multer.File): 'docx' | 'pdf' {
    return file.mimetype === LAWFIRM_PDF_MIME ||
      file.originalname.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : 'docx';
  }

  private async requireWritableSession(userId: string, sessionId: string) {
    const session = await this.requireSession(userId, sessionId);
    if (session.status !== 'receiving') {
      throw new ConflictException(`Upload session is ${session.status}`);
    }
    return session;
  }

  private async requireSession(userId: string, sessionId: string) {
    const session = await this.prisma.lawfirmTemplateUploadSession.findUnique({
      where: { id: sessionId },
      include: { templateSet: { select: { workspaceId: true } } },
    });
    if (!session) throw new NotFoundException('Upload session not found');
    await this.workspaceAccess.requireMembership(
      session.templateSet.workspaceId,
      userId,
    );
    return session;
  }

  private serialize(session: {
    id: string;
    templateSetId: string;
    status: string;
    totalDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    finalizedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      session_id: session.id,
      template_set_id: session.templateSetId,
      status: session.status,
      total_documents: session.totalDocuments,
      processed_documents: session.processedDocuments,
      failed_documents: session.failedDocuments,
      finalized_at: session.finalizedAt?.toISOString() ?? null,
      completed_at: session.completedAt?.toISOString() ?? null,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
    };
  }
}
