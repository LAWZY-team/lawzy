import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { getR2Env } from '../../config/env';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

const DEFAULT_STORAGE_BYTES =
  parseInt(process.env.DEFAULT_STORAGE_BYTES || '524288000', 10) ||
  500 * 1024 * 1024;
// `files.s3_key` is VARCHAR(191) in MySQL migrations.
const MAX_S3_KEY_LENGTH = 191;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly workspaceAccess: WorkspaceAccessService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client | null,
  ) {}

  private getBucket(): string {
    return getR2Env().bucket;
  }

  private ensureClient(): S3Client {
    if (!this.s3) {
      throw new Error('R2/S3 is not configured');
    }
    return this.s3;
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

  async upload(data: {
    file: Express.Multer.File;
    userId: string;
    workspaceId: string;
    category?: 'input_upload' | 'template' | 'export_output';
    documentId?: string | null;
  }) {
    await this.workspaceAccess.requireMembership(data.workspaceId, data.userId);
    const { bytes: used, limitBytes } = await this.getStorageUsed(
      data.workspaceId,
    );
    if (used + data.file.size > limitBytes) {
      throw new BadRequestException(
        `Storage limit exceeded. Used: ${used} bytes, limit: ${limitBytes} bytes.`,
      );
    }

    const client = this.ensureClient();
    const bucket = this.getBucket();
    const uuid = randomUUID();
    const originalName = this.fixUploadFilename(
      data.file.originalname || 'file',
    );
    const safeName = originalName
      .replace(/[^a-zA-Z0-9._\u00C0-\u024F\s-]/g, '_')
      .trim();
    const prefix = `uploads/${data.workspaceId}/${data.userId}/${uuid}-`;
    const maxNameLen = Math.max(1, MAX_S3_KEY_LENGTH - prefix.length);
    const safeKeyName = this.truncateForS3Key(safeName, maxNameLen);
    let key = `${prefix}${safeKeyName}`;
    if (key.length > MAX_S3_KEY_LENGTH) {
      // Absolute fallback to guarantee DB insert safety.
      key = `uploads/${data.workspaceId}/${data.userId}/${uuid}`;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data.file.buffer,
        ContentType: data.file.mimetype || 'application/octet-stream',
      }),
    );

    // Prisma types may be resolved from a different workspace node_modules in some editors;
    // keep runtime shape correct and avoid blocking on type resolution.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const createData = {
      name: originalName,
      size: data.file.size,
      mimeType: data.file.mimetype || 'application/octet-stream',
      s3Key: key,
      category: data.category ?? 'input_upload',
      documentId: data.documentId ?? null,
      userId: data.userId,
      workspaceId: data.workspaceId,
    } as any;

    return this.prisma.file.create({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: createData,
    });
  }

  private fixUploadFilename(input: string): string {
    const str = typeof input === 'string' && input.trim() ? input : 'file';

    // Some multipart parsers treat header params as latin1 and may produce mojibake
    // for UTF-8 filenames (common for Vietnamese).
    const candidates: string[] = [str];

    // 1) Common fix: interpret original string bytes as latin1 then decode as utf8.
    try {
      candidates.push(Buffer.from(str, 'latin1').toString('utf8'));
    } catch {
      // ignore
    }

    // 2) Sometimes the string is percent-encoded (RFC5987-ish) - decode if it looks like it.
    if (/%[0-9A-Fa-f]{2}/.test(str)) {
      try {
        candidates.push(decodeURIComponent(str));
      } catch {
        // ignore
      }
    }

    // Choose the "best" candidate by heuristic scoring.
    const score = (s: string) => {
      const repl = (s.match(/\uFFFD/g) ?? []).length;
      const mojibake = (s.match(/[ÃÂÄÅÆ]/g) ?? []).length;
      const viLetters = (s.match(/[\u0100-\u024F\u1E00-\u1EFF]/g) ?? []).length;
      let control = 0;
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code >= 0x0000 && code <= 0x001f) control++;
      }
      // lower is better except viLetters.
      return viLetters * 3 - repl * 10 - mojibake * 2 - control * 5;
    };

    let best = str;
    let bestScore = score(str);
    for (const c of candidates) {
      if (!c || typeof c !== 'string') continue;
      const sc = score(c);
      if (sc > bestScore) {
        best = c;
        bestScore = sc;
      }
    }

    return best;
  }

  async findByWorkspace(
    workspaceId: string,
    opts?: {
      page?: number;
      limit?: number;
      userId?: string;
      filterByUserId?: string;
      documentId?: string;
      category?: 'input_upload' | 'template' | 'export_output';
    },
  ) {
    if (opts?.userId) {
      await this.workspaceAccess.requireMembership(workspaceId, opts.userId);
    }
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: {
      workspaceId: string;
      userId?: string;
      documentId?: string;
      category?: 'input_upload' | 'template' | 'export_output';
    } = { workspaceId };
    if (opts?.filterByUserId) where.userId = opts.filterByUserId;
    if (opts?.documentId) where.documentId = opts.documentId;
    if (opts?.category) where.category = opts.category;

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, userId?: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (userId) {
      await this.workspaceAccess.requireMembership(file.workspaceId, userId);
    }
    return file;
  }

  async getDownloadStream(id: string, userId?: string) {
    const file = await this.findById(id, userId);
    const client = this.ensureClient();
    const bucket = this.getBucket();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: file.s3Key,
      }),
    );

    return {
      body: response.Body,
      contentType: file.mimeType,
      name: file.name,
    };
  }

  async delete(id: string, userId?: string) {
    const file = await this.findById(id, userId);
    const client = this.ensureClient();
    const bucket = this.getBucket();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: file.s3Key,
      }),
    );

    await this.prisma.file.delete({
      where: { id },
    });

    return { success: true };
  }

  async getStorageUsed(workspaceId: string, userId?: string) {
    if (userId) {
      await this.workspaceAccess.requireMembership(workspaceId, userId);
    }
    const [fileSum, sourceSum, workspace] = await Promise.all([
      this.prisma.file.aggregate({
        where: { workspaceId },
        _sum: { size: true },
      }),
      this.prisma.source.aggregate({
        where: { workspaceId },
        _sum: { size: true },
      }),
      this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true },
      }),
    ]);
    const bytes = (fileSum._sum.size ?? 0) + (sourceSum._sum.size ?? 0);
    let limitBytes: number | undefined;
    if (workspace?.plan) {
      try {
        const plan = await this.plansService.findBySlug(workspace.plan, true);
        const ql = plan.quotaLimits as { storageBytes?: number } | null;
        limitBytes =
          typeof ql?.storageBytes === 'number' ? ql.storageBytes : undefined;
        if (limitBytes == null) {
          const defaultPlan = await this.plansService.findDefaultPlan();
          const dq = defaultPlan?.quotaLimits as {
            storageBytes?: number;
          } | null;
          limitBytes =
            typeof dq?.storageBytes === 'number'
              ? dq.storageBytes
              : DEFAULT_STORAGE_BYTES;
        }
      } catch {
        limitBytes = DEFAULT_STORAGE_BYTES;
      }
    }
    return { bytes, limitBytes: limitBytes ?? DEFAULT_STORAGE_BYTES };
  }

  /** Admin: tổng dung lượng toàn hệ thống và breakdown theo workspace */
  async getAdminStorageOverview(options?: { fromR2?: boolean }) {
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true, name: true, plan: true },
      orderBy: { name: 'asc' },
    });
    const planBySlug = new Map<string, number>();
    const slugs = [...new Set(workspaces.map((w) => w.plan).filter(Boolean))];
    for (const slug of slugs) {
      try {
        const plan = await this.plansService.findBySlug(slug, true);
        const ql = plan.quotaLimits as { storageBytes?: number } | null;
        let storage =
          typeof ql?.storageBytes === 'number' ? ql.storageBytes : null;
        if (storage == null) {
          const def = await this.plansService.findDefaultPlan();
          const dq = def?.quotaLimits as { storageBytes?: number } | null;
          storage =
            typeof dq?.storageBytes === 'number'
              ? dq.storageBytes
              : DEFAULT_STORAGE_BYTES;
        }
        planBySlug.set(slug, storage);
      } catch {
        planBySlug.set(slug, DEFAULT_STORAGE_BYTES);
      }
    }

    let usedByWorkspace: Map<string, number>;
    if (options?.fromR2) {
      const r2Result = await this.getStorageFromR2();
      usedByWorkspace = r2Result.byWorkspace ?? new Map<string, number>();
    } else {
      const [fileSums, sourceSums] = await Promise.all([
        this.prisma.file.groupBy({
          by: ['workspaceId'],
          _sum: { size: true },
        }),
        this.prisma.source.groupBy({
          by: ['workspaceId'],
          _sum: { size: true },
        }),
      ]);
      usedByWorkspace = new Map<string, number>();
      for (const f of fileSums) {
        usedByWorkspace.set(
          f.workspaceId,
          (usedByWorkspace.get(f.workspaceId) ?? 0) + (f._sum.size ?? 0),
        );
      }
      for (const s of sourceSums) {
        usedByWorkspace.set(
          s.workspaceId,
          (usedByWorkspace.get(s.workspaceId) ?? 0) + (s._sum.size ?? 0),
        );
      }
    }

    let totalUsed = 0;
    const breakdown = workspaces.map((w) => {
      const used = usedByWorkspace.get(w.id) ?? 0;
      totalUsed += used;
      const limit = planBySlug.get(w.plan) ?? DEFAULT_STORAGE_BYTES;
      return {
        workspaceId: w.id,
        workspaceName: w.name,
        plan: w.plan,
        storageUsed: used,
        storageLimit: limit,
        percent: limit > 0 ? Math.min(100, (used / limit) * 100) : 0,
      };
    });

    return { totalUsed, breakdown };
  }

  /** Tính dung lượng từ R2 ListObjects (chính xác hơn, bao gồm object orphan) */
  async getStorageFromR2(
    workspaceId?: string,
  ): Promise<{ bytes: number; byWorkspace?: Map<string, number> }> {
    const client = this.ensureClient();
    const bucket = this.getBucket();
    const byWorkspace = new Map<string, number>();
    let totalBytes = 0;

    const prefixes = workspaceId
      ? [`uploads/${workspaceId}/`, `sources/${workspaceId}/`]
      : ['uploads/', 'sources/'];

    for (const prefix of prefixes) {
      let continuationToken: string | undefined;
      do {
        const cmd = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });
        const resp = await client.send(cmd);
        for (const obj of resp.Contents ?? []) {
          const size = obj.Size ?? 0;
          totalBytes += size;
          if (!workspaceId && obj.Key) {
            const m = obj.Key.match(/^(?:uploads|sources)\/([^/]+)\//);
            if (m) {
              const wsId = m[1];
              byWorkspace.set(wsId, (byWorkspace.get(wsId) ?? 0) + size);
            }
          }
        }
        continuationToken = resp.IsTruncated
          ? resp.NextContinuationToken
          : undefined;
      } while (continuationToken);
    }

    return workspaceId
      ? { bytes: totalBytes }
      : { bytes: totalBytes, byWorkspace };
  }
}
