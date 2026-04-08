import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { getR2Env } from '../../config/env';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { s3SendWithRetry } from '../../integrations/r2/s3-send-with-retry';
import { FilesService } from '../files/files.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';
import { EmbeddingService } from '../source-processing/embedding.service';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);
  private readonly bucket = getR2Env().bucket;

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly processingService: SourceProcessingService,
    private readonly embeddingService: EmbeddingService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client,
  ) {}

  async create(data: {
    title: string;
    type: string;
    userId: string;
    workspaceId: string;
    file?: Express.Multer.File;
    tags?: string[];
    sourceUrl?: string;
    scope?: string;
  }) {
    const isSystemScope =
      data.scope === 'system' || data.scope === 'premium';

    if (!isSystemScope && data.workspaceId) {
      await this.workspaceAccess.requireMembership(
        data.workspaceId,
        data.userId,
      );

      const quotaLimits = await this.getWorkspaceSourceQuota(data.workspaceId);

      if (quotaLimits.maxSources !== 'unlimited') {
        const currentCount = await this.prisma.source.count({
          where: { workspaceId: data.workspaceId, scope: 'workspace' },
        });
        if (currentCount >= (quotaLimits.maxSources ?? 3)) {
          throw new BadRequestException(
            `Source limit reached. Current: ${currentCount}, limit: ${quotaLimits.maxSources ?? 3}. Upgrade your plan for more sources.`,
          );
        }
      }

      const allowedTypes = quotaLimits.sourceTypes ?? ['pdf'];
      if (!allowedTypes.includes(data.type)) {
        throw new BadRequestException(
          `File type "${data.type}" is not allowed on your plan. Allowed: ${allowedTypes.join(', ')}`,
        );
      }

      if (data.type === 'url' && !quotaLimits.urlSourceEnabled) {
        throw new BadRequestException(
          'URL sources are not available on your plan. Upgrade to Pro or higher.',
        );
      }
    }
    const fileSize = data.file?.size ?? 0;
    if (fileSize > 0 && !isSystemScope && data.workspaceId) {
      const { bytes: used, limitBytes } =
        await this.filesService.getStorageUsed(data.workspaceId);
      if (used + fileSize > limitBytes) {
        throw new BadRequestException(
          `Storage limit exceeded. Used: ${used} bytes, limit: ${limitBytes} bytes.`,
        );
      }
    }

    const uuid = randomUUID();
    let s3Key: string | null = null;

    if (data.file) {
      if (!this.s3) {
        throw new BadRequestException('File storage is not configured');
      }
      const filename = data.file.originalname || 'file';
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix = isSystemScope
        ? `sources/system/${data.userId}`
        : `sources/${data.workspaceId}/${data.userId}`;
      s3Key = `${prefix}/${uuid}-${safeName}`;

      try {
        await s3SendWithRetry(
          this.s3,
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3Key,
            Body: data.file.buffer,
            ContentType: data.file.mimetype || 'application/octet-stream',
          }),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`R2 PutObject failed for ${s3Key}: ${message}`);
        throw new ServiceUnavailableException(
          'Could not upload file to storage. Check R2 configuration and network.',
        );
      }
    }

    const source = await this.prisma.source.create({
      data: {
        title: data.title,
        type: data.type || 'pdf',
        status: 'pending',
        scope: data.scope || 'workspace',
        s3Key,
        sourceUrl: data.sourceUrl || null,
        size: fileSize,
        userId: data.userId,
        workspaceId: isSystemScope ? null : data.workspaceId,
        tags: data.tags ? (data.tags as Prisma.InputJsonValue) : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    this.processingService.processSource(source.id).catch((err) => {
      this.logger.error(
        `Background processing failed for source ${source.id}: ${err}`,
      );
    });

    return source;
  }

  /**
   * Which Lawzy (non-workspace) source scopes a workspace may see, based on plan quota.
   * basic | full → system only; premium → system + premium.
   */
  private resolveLawzyScopes(systemSourceAccess: string): ('system' | 'premium')[] {
    if (systemSourceAccess === 'premium') {
      return ['system', 'premium'];
    }
    return ['system'];
  }

  /**
   * Read-only catalog of Lawzy-managed sources for workspace members, filtered by plan.
   */
  async findLawzyCatalog(
    workspaceId: string,
    userId: string,
    opts?: { page?: number; limit?: number },
  ) {
    await this.workspaceAccess.requireMembership(workspaceId, userId);
    const quota = await this.getWorkspaceSourceQuota(workspaceId);
    const scopes = this.resolveLawzyScopes(quota.systemSourceAccess);
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 30, 100);
    const skip = (page - 1) * limit;
    const where: Prisma.SourceWhereInput = {
      workspaceId: null,
      scope: { in: scopes },
    };
    const [data, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          scope: true,
          pageCount: true,
          chunkCount: true,
          tags: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.source.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      limit,
      systemSourceAccess: quota.systemSourceAccess,
    };
  }

  async findByWorkspace(
    workspaceId: string,
    opts?: {
      page?: number;
      limit?: number;
      userId?: string;
      includeSystem?: boolean;
    },
  ) {
    if (opts?.userId) {
      await this.workspaceAccess.requireMembership(workspaceId, opts.userId);
    }
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const whereConditions: Prisma.SourceWhereInput[] = [
      { workspaceId, scope: 'workspace' },
    ];
    if (opts?.includeSystem) {
      const quota = await this.getWorkspaceSourceQuota(workspaceId);
      const scopes = this.resolveLawzyScopes(quota.systemSourceAccess);
      for (const scope of scopes) {
        whereConditions.push({ scope, workspaceId: null });
      }
    }

    const where: Prisma.SourceWhereInput = { OR: whereConditions };

    const [data, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          scope: true,
          s3Key: true,
          sourceUrl: true,
          size: true,
          pageCount: true,
          chunkCount: true,
          tags: true,
          userId: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.source.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Text chunks for a workspace-owned source (no embeddings). Membership required.
   */
  async findSourceChunksForReader(sourceId: string, userId: string) {
    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true, workspaceId: true, scope: true },
    });
    if (!source) {
      throw new NotFoundException('Source not found');
    }
    if (!source.workspaceId) {
      throw new ForbiddenException('Chunks are only available for workspace sources');
    }
    await this.workspaceAccess.requireMembership(source.workspaceId, userId);
    const chunks = await this.prisma.sourceChunk.findMany({
      where: { sourceId },
      orderBy: [{ pageNumber: 'asc' }, { chunkIndex: 'asc' }],
      select: {
        id: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
        tokenCount: true,
      },
    });
    return { chunks };
  }

  /** Full chunk list for any source (admin tooling). */
  async findSourceChunksForAdmin(sourceId: string) {
    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true },
    });
    if (!source) {
      throw new NotFoundException('Source not found');
    }
    const chunks = await this.prisma.sourceChunk.findMany({
      where: { sourceId },
      orderBy: [{ pageNumber: 'asc' }, { chunkIndex: 'asc' }],
      select: {
        id: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
        tokenCount: true,
      },
    });
    return { chunks };
  }

  async findById(id: string, userId?: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        workspace: {
          select: { id: true, name: true },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    if (userId && source.workspaceId) {
      await this.workspaceAccess.requireMembership(
        source.workspaceId,
        userId,
      );
    }
    return source;
  }

  /**
   * Semantic search across workspace + Lawzy sources allowed by plan.
   * Uses query embeddings (gemini-embedding-001) plus keyword overlap so retrieval
   * still works when API keys fail, dimensions mismatch, or legacy chunk vectors.
   */
  async semanticSearch(params: {
    query: string;
    workspaceId: string;
    userId: string;
    topK?: number;
    includeSystemSources?: boolean;
    sourceIds?: string[];
  }) {
    await this.workspaceAccess.requireMembership(
      params.workspaceId,
      params.userId,
    );
    const topK = params.topK ?? 10;

    const sourceConditions: Prisma.SourceWhereInput[] = [
      { workspaceId: params.workspaceId, scope: 'workspace' },
    ];
    if (params.includeSystemSources) {
      const quota = await this.getWorkspaceSourceQuota(params.workspaceId);
      const scopes = this.resolveLawzyScopes(quota.systemSourceAccess);
      for (const scope of scopes) {
        sourceConditions.push({ scope, workspaceId: null });
      }
    }

    const sourceWhere: Prisma.SourceWhereInput = {
      OR: sourceConditions,
      status: 'completed',
      ...(params.sourceIds?.length
        ? { id: { in: params.sourceIds } }
        : {}),
    };

    const sources = await this.prisma.source.findMany({
      where: sourceWhere,
      select: { id: true, title: true },
    });

    if (sources.length === 0) return [];

    const sourceIds = sources.map((s) => s.id);
    const sourceTitleMap = new Map(sources.map((s) => [s.id, s.title]));

    const queryEmbedding = await this.embeddingService.embedQuery(params.query);
    const tokens = this.extractSearchTokens(params.query);
    const mandatorySlugs = this.extractMandatoryNumericSlugs(params.query);

    const chunks = await this.prisma.sourceChunk.findMany({
      where: {
        sourceId: { in: sourceIds },
        metadata: { path: '$.type', equals: 'child' },
      },
      select: {
        id: true,
        sourceId: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
        embedding: true,
      },
      take: 6000,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const scored = chunks
      .map((chunk) => {
        const title = sourceTitleMap.get(chunk.sourceId) || '';
        const hayFold = this.foldViForMatch(`${title}\n${chunk.content}`);
        if (
          mandatorySlugs.length > 0 &&
          !mandatorySlugs.some((slug) => hayFold.includes(this.foldViForMatch(slug)))
        ) {
          return null;
        }
        const kwHitRatio = this.scoreChunkKeywordOverlap(
          chunk.content,
          title,
          tokens,
        );
        const kwPart = Math.min(1, kwHitRatio * 1.2);
        const emb = chunk.embedding as number[] | null;
        let vecSim = 0;
        if (
          queryEmbedding.length > 0 &&
          emb &&
          emb.length > 0 &&
          emb.length === queryEmbedding.length
        ) {
          vecSim = this.embeddingService.cosineSimilarity(
            queryEmbedding,
            emb,
          );
        }
        let relevance: number;
        if (vecSim >= 0.18) {
          relevance = vecSim * 0.48 + kwPart * 0.52;
        } else {
          relevance = kwPart;
        }
        if (kwHitRatio === 0 && vecSim < 0.2) {
          return null;
        }
        return {
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          sourceTitle: title,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          relevance: Math.round(relevance * 10000) / 10000,
        };
      })
      .filter(Boolean) as Array<{
      chunkId: string;
      sourceId: string;
      sourceTitle: string;
      content: string;
      pageNumber: number | null;
      chunkIndex: number;
      relevance: number;
    }>;

    scored.sort((a, b) => b.relevance - a.relevance);
    return scored.slice(0, topK);
  }

  /** Tokens for keyword scoring (Vietnamese + số hiệu văn bản). */
  private extractSearchTokens(query: string): string[] {
    const raw = query.trim().toLowerCase();
    const tokens = new Set<string>();
    for (const m of raw.matchAll(/\d+\/\d+(?:\/[a-z0-9-]+)?/gi)) {
      tokens.add(m[0].replace(/\s+/g, ''));
    }
    for (const m of raw.matchAll(/\d{4}\s*[-–]\s*\d{4}/g)) {
      tokens.add(m[0].replace(/\s+/g, ''));
    }
    const words = raw
      .split(
        /[^a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ0-9]+/i,
      )
      .filter((w) => w.length >= 2);
    for (const w of words) {
      tokens.add(w);
    }
    if (tokens.size === 0 && raw.length >= 3) {
      tokens.add(raw.slice(0, 120));
    }
    return [...tokens];
  }

  /** Share of query tokens that appear in title or chunk body (0–1). */
  private scoreChunkKeywordOverlap(
    content: string,
    title: string,
    tokens: string[],
  ): number {
    if (tokens.length === 0) return 0;
    const hay = `${title}\n${content}`.toLowerCase();
    const hayF = this.foldViForMatch(hay);
    let hits = 0;
    for (const t of tokens) {
      if (hay.includes(t) || hayF.includes(this.foldViForMatch(t))) hits++;
    }
    return hits / tokens.length;
  }

  /** Số hiệu dạng 18/2025… trong query — chunk phải chứa (sau khi bỏ dấu) để tránh nhầm NQ khác. */
  private extractMandatoryNumericSlugs(query: string): string[] {
    const raw = query.trim().toLowerCase();
    const found = new Set<string>();
    for (const m of raw.matchAll(/\d+\/\d+(?:\/[^\s,;.]+)?/g)) {
      const s = m[0].replace(/\s+/g, '');
      found.add(s);
      const two = s.match(/^(\d+\/\d+)/);
      if (two) found.add(two[1]);
    }
    return [...found];
  }

  private foldViForMatch(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/đ/g, 'd');
  }

  async delete(id: string, userId?: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    if (userId && source.workspaceId) {
      await this.workspaceAccess.requireMembership(
        source.workspaceId,
        userId,
      );
    }
    if (source.s3Key && this.s3) {
      await s3SendWithRetry(
        this.s3,
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: source.s3Key,
        }),
      );
    }

    return this.prisma.source.delete({
      where: { id },
    });
  }

  private async getWorkspaceSourceQuota(workspaceId: string): Promise<{
    maxSources: number | 'unlimited';
    maxSourceSizeBytes: number;
    sourceTypes: string[];
    systemSourceAccess: string;
    citationsEnabled: boolean;
    urlSourceEnabled: boolean;
  }> {
    const defaults = {
      maxSources: 3 as number | 'unlimited',
      maxSourceSizeBytes: 20 * 1024 * 1024,
      sourceTypes: ['pdf'],
      systemSourceAccess: 'basic',
      citationsEnabled: false,
      urlSourceEnabled: false,
    };

    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true, quotaLimits: true },
      });

      if (!workspace) return defaults;

      let quotaLimits = workspace.quotaLimits as Record<string, unknown> | null;

      if (!quotaLimits && workspace.plan) {
        const plan = await this.prisma.membershipPlan.findFirst({
          where: { slug: workspace.plan, isActive: true },
          select: { quotaLimits: true },
        });
        quotaLimits = plan?.quotaLimits as Record<string, unknown> | null;
      }

      if (!quotaLimits) return defaults;

      return {
        maxSources: (quotaLimits.maxSources as number | 'unlimited') ?? defaults.maxSources,
        maxSourceSizeBytes: (quotaLimits.maxSourceSizeBytes as number) ?? defaults.maxSourceSizeBytes,
        sourceTypes: (quotaLimits.sourceTypes as string[]) ?? defaults.sourceTypes,
        systemSourceAccess: (quotaLimits.systemSourceAccess as string) ?? defaults.systemSourceAccess,
        citationsEnabled: (quotaLimits.citationsEnabled as boolean) ?? defaults.citationsEnabled,
        urlSourceEnabled: (quotaLimits.urlSourceEnabled as boolean) ?? defaults.urlSourceEnabled,
      };
    } catch {
      return defaults;
    }
  }

  async reprocessSource(id: string, userId?: string) {
    const source = await this.findById(id, userId);
    this.processingService.processSource(source.id).catch((err) => {
      this.logger.error(`Reprocessing failed for source ${id}: ${err}`);
    });
    return { message: 'Reprocessing started' };
  }
}
