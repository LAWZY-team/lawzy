import { Injectable, Logger } from '@nestjs/common';
import * as https from 'node:https';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { SourcesService } from './sources.service';

const PHAPLUAT_API = 'https://phapluat.gov.vn/api/legal-documents';
const PHAPLUAT_DETAIL = 'https://phapluat.gov.vn/api/legal-documents/detail';
const PAGE_SIZE = 20;
const REQUEST_DELAY_MS = 250;

/** Giống trình duyệt — một số API chặn request không có User-Agent. */
const CRAWLER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
};

function formatNodeFetchError(err: unknown): string {
  const parts: string[] = [];
  const walk = (e: unknown, depth: number): void => {
    if (e == null || depth > 6) return;
    if (e instanceof Error) {
      parts.push(e.message);
      const any = e as Error & {
        code?: string;
        errno?: number | string;
        syscall?: string;
        cause?: unknown;
      };
      if (any.code) parts.push(`code=${any.code}`);
      if (any.errno !== undefined) parts.push(`errno=${String(any.errno)}`);
      if (any.syscall) parts.push(`syscall=${any.syscall}`);
      walk(any.cause, depth + 1);
      return;
    }
    if (typeof e === 'object' && 'message' in (e as object)) {
      parts.push(String((e as { message: unknown }).message));
    }
  };
  walk(err, 0);
  return parts.filter(Boolean).join(' | ') || String(err);
}

interface CrawlHttpResult {
  ok: boolean;
  status: number;
  json: <T>() => Promise<T>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

interface PhaplaatDoc {
  docGUId: string;
  docName: string;
  docNameClear: string;
  docIdentity: string;
  docTypeId: number;
  issueDate: string;
  effectDate: string;
  expireDate: string;
  effectStatusId: number;
  effectStatusName: string;
  docGroupId: number;
  languageId: number;
  crDateTime: string;
}

interface PhaplaatDetailFile {
  languageId: number;
  filePath: string;
  dataSourceId: number;
  fileType: { fileTypeId: number; fileTypeName: string };
}

interface PhaplaatDetail {
  docGUId: string;
  docName: string;
  docIdentity: string;
  docContent?: string;
  issueDate: string;
  effectDate: string;
  expireDate: string;
  docType?: { docTypeId: number; docTypeName: string };
  effectStatus?: { effectStatusId: number; effectStatusName: string };
  fields?: { fieldId: number; fieldName: string }[];
  organs?: { organId: number; organName: string }[];
  signers?: { signerId: number; signerName: string }[];
  docFiles?: PhaplaatDetailFile[];
}

export interface CrawlJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
  currentDoc?: string;
}

export interface CrawlParams {
  userId: string;
  pageFrom: number;
  pageTo: number;
  fieldIds?: number[];
  docTypeIds?: number[];
}

@Injectable()
export class LegalCrawlerService {
  private readonly logger = new Logger(LegalCrawlerService.name);
  private readonly jobs = new Map<string, CrawlJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sourcesService: SourcesService,
  ) {}

  /**
   * HTTPS tới phapluat.gov.vn — server gửi thiếu intermediate; cần NODE_EXTRA_CA_CERTS trỏ tới PEM intermediate (xem backend/tls/).
   * LEGAL_CRAWLER_TLS_STRICT mặc định bật (chỉ tắt khi set LEGAL_CRAWLER_TLS_STRICT=false).
   * LEGAL_CRAWLER_TLS_INSECURE=true: bỏ verify (không dùng production).
   */
  private httpsRequestRaw(params: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
    insecureTls: boolean;
  }): Promise<{ statusCode: number; body: Buffer }> {
    return new Promise((resolve, reject) => {
      const u = new URL(params.url);
      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: `${u.pathname}${u.search}`,
          method: params.method,
          headers: params.headers,
          rejectUnauthorized: !params.insecureTls,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode ?? 0,
              body: Buffer.concat(chunks),
            });
          });
        },
      );
      req.on('error', (err) => reject(err));
      if (params.body !== undefined) req.write(params.body, 'utf8');
      req.end();
    });
  }

  private toCrawlHttpResult(raw: {
    statusCode: number;
    body: Buffer;
  }): CrawlHttpResult {
    const bodyBuf = raw.body;
    return {
      ok: raw.statusCode >= 200 && raw.statusCode < 300,
      status: raw.statusCode,
      json: async <T>() => JSON.parse(bodyBuf.toString('utf8')) as T,
      arrayBuffer: async () =>
        bodyBuf.buffer.slice(
          bodyBuf.byteOffset,
          bodyBuf.byteOffset + bodyBuf.byteLength,
        ) as ArrayBuffer,
    };
  }

  private async crawlHttp(options: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
  }): Promise<CrawlHttpResult> {
    const forceInsecure =
      process.env.LEGAL_CRAWLER_TLS_INSECURE === 'true' ||
      process.env.LEGAL_CRAWLER_TLS_INSECURE === '1';
    const strictTls = process.env.LEGAL_CRAWLER_TLS_STRICT !== 'false';
    if (strictTls && forceInsecure) {
      this.logger.warn(
        'LEGAL_CRAWLER_TLS_INSECURE is set but LEGAL_CRAWLER_TLS_STRICT is not false — refusing to disable TLS verification.',
      );
    }
    const insecureTls = forceInsecure && !strictTls;
    try {
      const raw = await this.httpsRequestRaw({
        url: options.url,
        method: options.method,
        headers: options.headers,
        body: options.body,
        insecureTls,
      });
      return this.toCrawlHttpResult(raw);
    } catch (err) {
      throw new Error(formatNodeFetchError(err));
    }
  }

  getJob(jobId: string): CrawlJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Start a background crawl job. Returns immediately with jobId.
   */
  startCrawl(params: CrawlParams): string {
    const jobId = randomUUID();
    const job: CrawlJob = {
      id: jobId,
      status: 'running',
      total: 0,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [],
      startedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    this.executeCrawl(jobId, params).catch((err) => {
      this.logger.error(`Crawl job ${jobId} failed: ${err}`);
      job.status = 'failed';
      job.errors.push(String(err));
      job.completedAt = new Date();
    });
    return jobId;
  }

  private async executeCrawl(
    jobId: string,
    params: CrawlParams,
  ): Promise<void> {
    const job = this.jobs.get(jobId)!;

    try {
      const allDocs: PhaplaatDoc[] = [];
      for (let page = params.pageFrom; page <= params.pageTo; page++) {
        const docs = await this.fetchDocumentList(
          page,
          params.fieldIds,
          params.docTypeIds,
        );
        if (docs.length === 0) break;
        allDocs.push(...docs);
        if (page === params.pageFrom) {
          const totalEstimate = (params.pageTo - params.pageFrom + 1) * PAGE_SIZE;
          job.total = Math.min(totalEstimate, allDocs.length + (params.pageTo - page) * PAGE_SIZE);
        }
      }

      job.total = allDocs.length;
      this.logger.log(`Crawl ${jobId}: fetched ${allDocs.length} document references`);

      for (const doc of allDocs) {
        try {
          job.currentDoc = doc.docIdentity || doc.docName?.substring(0, 60);

          const existing = await this.findExistingByExternalId(doc.docGUId);
          if (existing) {
            job.skipped++;
            job.processed++;
            continue;
          }

          await this.processDocument(doc, params.userId);
          job.created++;
        } catch (err) {
          const msg = `${doc.docIdentity}: ${String(err)}`;
          job.errors.push(msg);
          this.logger.warn(`Crawl ${jobId} doc error: ${msg}`);
        }
        job.processed++;
        await this.delay(REQUEST_DELAY_MS);
      }

      job.status = 'completed';
    } catch (err) {
      job.status = 'failed';
      job.errors.push(String(err));
      this.logger.error(`Crawl ${jobId} failed: ${err}`);
    }
    job.completedAt = new Date();
    job.currentDoc = undefined;
  }

  private async processDocument(
    doc: PhaplaatDoc,
    userId: string,
  ): Promise<void> {
    const detail = await this.fetchDocumentDetail(doc.docGUId, 'taive');

    const pdfFile = detail?.docFiles?.find(
      (f) => f.filePath && f.filePath.endsWith('.pdf.aspx'),
    );

    let fileBuffer: Buffer | undefined;
    let fileType = 'text';

    if (pdfFile) {
      fileBuffer = await this.downloadFile(pdfFile.filePath);
      fileType = 'pdf';
    }

    if (!fileBuffer) {
      const contentDetail = await this.fetchDocumentDetail(doc.docGUId, 'noidung');
      if (contentDetail?.docContent) {
        const plainText = this.stripHtml(contentDetail.docContent);
        if (plainText.length > 100) {
          fileBuffer = Buffer.from(plainText, 'utf-8');
          fileType = 'txt';
        }
      }
    }

    if (!fileBuffer) {
      throw new Error('No PDF or text content available');
    }

    const tags = {
      externalId: doc.docGUId,
      externalSource: 'phapluat.gov.vn',
      docIdentity: doc.docIdentity,
      docTypeId: doc.docTypeId,
      issueDate: doc.issueDate,
      effectDate: doc.effectDate,
      effectStatusName: doc.effectStatusName,
      fields: detail?.fields?.map((f) => f.fieldName) ?? [],
      organs: detail?.organs?.map((o) => o.organName) ?? [],
      signers: detail?.signers?.map((s) => s.signerName) ?? [],
      docTypeName: detail?.docType?.docTypeName ?? '',
    };

    const virtualFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: `${doc.docIdentity?.replace(/\//g, '_') || doc.docGUId}.${fileType === 'pdf' ? 'pdf' : 'txt'}`,
      encoding: '7bit',
      mimetype: fileType === 'pdf' ? 'application/pdf' : 'text/plain',
      buffer: fileBuffer,
      size: fileBuffer.length,
      stream: undefined as any,
      destination: '',
      filename: '',
      path: '',
    };

    await this.sourcesService.create({
      title: doc.docName || doc.docIdentity,
      type: fileType,
      userId,
      workspaceId: '',
      file: virtualFile,
      tags: tags as any,
      scope: 'system',
    });
  }

  private async fetchDocumentList(
    page: number,
    fieldIds?: number[],
    docTypeIds?: number[],
  ): Promise<PhaplaatDoc[]> {
    const body: Record<string, unknown> = { page, limit: PAGE_SIZE };
    if (fieldIds?.length) body.fieldIds = fieldIds;
    if (docTypeIds?.length) body.docTypeIds = docTypeIds;

    const headers: Record<string, string> = {
      ...CRAWLER_HEADERS,
      'Content-Type': 'application/json',
    };
    const res = await this.crawlHttp({
      url: PHAPLUAT_API,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`List API returned ${res.status}`);
    const json = (await res.json()) as { data: { docs: PhaplaatDoc[] } };
    return json.data?.docs ?? [];
  }

  private async fetchDocumentDetail(
    docGUId: string,
    tabName: string,
  ): Promise<PhaplaatDetail | null> {
    const url = `${PHAPLUAT_DETAIL}?docGUId=${encodeURIComponent(docGUId)}&tabName=${tabName}`;
    const res = await this.crawlHttp({
      url,
      method: 'GET',
      headers: { ...CRAWLER_HEADERS },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: PhaplaatDetail };
    return json.data ?? null;
  }

  private async downloadFile(fileUrl: string): Promise<Buffer | undefined> {
    try {
      const res = await this.crawlHttp({
        url: fileUrl,
        method: 'GET',
        headers: { ...CRAWLER_HEADERS },
      });
      if (!res.ok) return undefined;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return undefined;
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async findExistingByExternalId(
    docGUId: string,
  ): Promise<boolean> {
    const existing = await this.prisma.source.findFirst({
      where: {
        scope: { in: ['system', 'premium'] },
        tags: { path: '$.externalId', equals: docGUId },
      },
      select: { id: true },
    });
    return !!existing;
  }
}
