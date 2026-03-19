import { Inject, Injectable } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { getR2Env } from '../../config/env';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';

interface S3TemplateDefinition {
  templateId?: string;
  slug?: string;
  version?: string;
  status?: string;
  type?: string;
  title: string;
  description?: string;
  contentJSON?: unknown;
  mergeFields?: unknown;
  industry?: string[];
  lawVersions?: string[];
  primaryLaw?: string;
  secondaryLaw?: string[];
  useCaseTag?: string;
  complexityTag?: string;
  thumbnail?: string;
  popularity?: number;
  usageStats?: unknown;
  author?: string;
  reviewStatus?: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

interface S3TemplateJson {
  templates?: S3TemplateDefinition[];
}

async function streamToString(body: unknown): Promise<string> {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (body instanceof Uint8Array) return Buffer.from(body).toString('utf8');
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  return String(body);
}

@Injectable()
export class TemplatesService {
  private readonly bucket = getR2Env().bucket;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client | null,
  ) {}

  private ensureClient(): S3Client {
    if (!this.s3) {
      throw new Error('R2/S3 is not configured');
    }
    return this.s3;
  }

  async findAll(opts?: { scope?: string; category?: string }) {
    const where: Record<string, unknown> = {};
    if (opts?.scope) where.scope = opts.scope;
    if (opts?.category) where.category = opts.category;

    return this.prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        scope: true,
        contentJSON: true,
        mergeFields: true,
        metadata: true,
        s3Key: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.template.findUnique({ where: { id } });
  }

  async create(data: {
    title: string;
    description?: string;
    category?: string;
    scope?: string;
    contentJSON?: unknown;
    mergeFields?: unknown;
    metadata?: unknown;
    createdBy?: string;
  }) {
    return this.prisma.template.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category ?? 'general',
        scope: data.scope ?? 'system',
        contentJSON: data.contentJSON ? JSON.parse(JSON.stringify(data.contentJSON)) : undefined,
        mergeFields: data.mergeFields ? JSON.parse(JSON.stringify(data.mergeFields)) : undefined,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        createdBy: data.createdBy,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      contentJSON?: unknown;
      mergeFields?: unknown;
      metadata?: unknown;
    },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.contentJSON !== undefined)
      updateData.contentJSON = JSON.parse(JSON.stringify(data.contentJSON));
    if (data.mergeFields !== undefined)
      updateData.mergeFields = JSON.parse(JSON.stringify(data.mergeFields));
    if (data.metadata !== undefined)
      updateData.metadata = JSON.parse(JSON.stringify(data.metadata));

    return this.prisma.template.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    return this.prisma.template.delete({ where: { id } });
  }

  async importFromS3Json(params?: {
    key?: string;
    scope?: string;
  }): Promise<{ created: number; updated: number; total: number }> {
    const client = this.ensureClient();
    const key = params?.key ?? 'templates/contracts/templates.json';
    const scope = params?.scope ?? 'system';

    const obj = await client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const raw = await streamToString(obj.Body);
    if (!raw.trim()) {
      return { created: 0, updated: 0, total: 0 };
    }

    let parsed: S3TemplateJson | S3TemplateDefinition[];
    try {
      parsed = JSON.parse(raw) as S3TemplateJson | S3TemplateDefinition[];
    } catch (e) {
      throw new Error('Failed to parse templates JSON from S3');
    }

    let list: S3TemplateDefinition[] = [];
    if (Array.isArray(parsed)) {
      // Root is an array of templates
      list = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.templates)) {
      // Root is { templates: [...] }
      list = parsed.templates;
    }
    let created = 0;
    let updated = 0;

    // Import or update each template based on title + scope
    for (const tmpl of list) {
      const title = typeof tmpl.title === 'string' ? tmpl.title.trim() : '';
      if (!title) continue;

      const category =
        (typeof tmpl.type === 'string' && tmpl.type.trim()) ||
        (typeof (tmpl as { category?: string }).category === 'string' &&
          (tmpl as { category?: string }).category!.trim()) ||
        'general';

      const description =
        typeof tmpl.description === 'string' ? tmpl.description : undefined;

      const metadata: Record<string, unknown> = {
        templateId: tmpl.templateId,
        slug: tmpl.slug,
        version: tmpl.version,
        status: tmpl.status,
        industry: tmpl.industry,
        lawVersions: tmpl.lawVersions,
        primaryLaw: tmpl.primaryLaw,
        secondaryLaw: tmpl.secondaryLaw,
        useCaseTag: tmpl.useCaseTag,
        complexityTag: tmpl.complexityTag,
        thumbnail: tmpl.thumbnail,
        popularity: tmpl.popularity,
        usageStats: tmpl.usageStats,
        author: tmpl.author,
        reviewStatus: tmpl.reviewStatus,
        reviewNotes: tmpl.reviewNotes,
        createdAt: tmpl.createdAt,
        updatedAt: tmpl.updatedAt,
        updatedBy: tmpl.updatedBy,
      };

      const existing = await this.prisma.template.findFirst({
        where: {
          title,
          scope,
        },
      });

      if (existing) {
        await this.update(existing.id, {
          description,
          category,
          contentJSON: tmpl.contentJSON,
          mergeFields: tmpl.mergeFields,
          metadata,
        });
        updated += 1;
      } else {
        await this.create({
          title,
          description,
          category,
          scope,
          contentJSON: tmpl.contentJSON,
          mergeFields: tmpl.mergeFields,
          metadata,
        });
        created += 1;
      }
    }

    return { created, updated, total: list.length };
  }
}
