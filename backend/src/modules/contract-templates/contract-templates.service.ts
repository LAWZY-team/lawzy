import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { getR2Env } from '../../config/env';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { UsersService } from '../users/users.service';
import { buildContractTemplateJson } from './build-contract-template-json';
import { extractContractTemplateText } from './extract-contract-template-text';
import { sanitizeContractTemplateFields } from './sanitize-contract-template-fields';
import { AiSanitizerService } from './ai-sanitizer.service';
import type {
  ContractTemplateMetadata,
  ContractTemplateFile,
  StructuredContractTemplate,
  TemplateScope,
} from './contract-templates.types';

const SYSTEM_PREFIX = 'templates/system/';
const COMMUNITY_PREFIX = 'templates/community/';
const INTERNAL_PREFIX = 'templates/internal/';
// Backward-compat: some existing objects may already be stored directly under `templates/`
// (as seen in Cloudflare UI when browsing the `templates/` prefix).
const LEGACY_SYSTEM_PREFIX = 'templates/';

function prefixForScope(scope: TemplateScope): string {
  if (scope === 'system') return SYSTEM_PREFIX;
  if (scope === 'internal') return INTERNAL_PREFIX;
  return COMMUNITY_PREFIX;
}

function sanitizeHeaderValue(input: string | undefined): string | undefined {
  if (!input) return undefined;
  // Chuẩn hóa không dấu trước khi lọc ASCII để tránh mất ký tự
  const normalized = removeAccents(input);
  // loại bỏ ký tự xuống dòng và ký tự ngoài ASCII cơ bản
  const cleaned = normalized.replace(/[\r\n]/g, ' ').replace(/[^\x20-\x7E]/g, '');
  return cleaned.trim().slice(0, 200); // giới hạn độ dài cho chắc
}

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function sanitizeBaseName(input: string): string {
  const normalized = removeAccents(input);
  const trimmed = normalized.trim();
  const noExt = trimmed.replace(/\.[^/.]+$/, '');
  const collapsed = noExt.replace(/\s+/g, '-');
  const cleaned = collapsed.replace(/[\\/:*?"<>|]+/g, '').replace(/-+/g, '-');
  return cleaned.replace(/^-|-$/g, '');
}

function getMetadataString(
  meta: Record<string, string> | undefined,
  key: string,
): string | undefined {
  if (!meta) return undefined;
  const v = meta[key];
  if (!v) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function parseTemplateMeta(input: unknown): ContractTemplateMetadata {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const obj = input as Record<string, unknown>;
  return {
    workspaceId:
      typeof obj.workspaceId === 'string' ? obj.workspaceId : undefined,
    fileName: typeof obj.fileName === 'string' ? obj.fileName : undefined,
    mimeType: typeof obj.mimeType === 'string' ? obj.mimeType : undefined,
    fileSize: typeof obj.fileSize === 'number' ? obj.fileSize : undefined,
    legacyId: typeof obj.legacyId === 'string' ? obj.legacyId : undefined,
    sourceFileName:
      typeof obj.sourceFileName === 'string' ? obj.sourceFileName : undefined,
    processingStatus:
      typeof obj.processingStatus === 'string'
        ? (obj.processingStatus as 'ready' | 'failed')
        : undefined,
    publishStatus:
      typeof obj.publishStatus === 'string'
        ? (obj.publishStatus as 'published' | 'hidden')
        : undefined,
    sanitizedFieldCount:
      typeof obj.sanitizedFieldCount === 'number'
        ? obj.sanitizedFieldCount
        : undefined,
    structuredAt:
      typeof obj.structuredAt === 'string' ? obj.structuredAt : undefined,
  };
}

@Injectable()
export class ContractTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly aiSanitizer: AiSanitizerService,
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

  private parseRoles(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map((v) => String(v).toLowerCase());
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).toLowerCase());
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) return false;
    const roles = this.parseRoles(user.roles);
    return roles.includes('admin');
  }

  private async headMetadata(
    key: string,
  ): Promise<{ name?: string; description?: string }> {
    try {
      const head = await this.ensureClient().send(
        new HeadObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        }),
      );
      // AWS SDK lowercases user-defined metadata keys
      return {
        name: getMetadataString(head.Metadata, 'name'),
        description: getMetadataString(head.Metadata, 'description'),
      };
    } catch {
      return {};
    }
  }

  private async listForPrefix(prefix: string): Promise<ContractTemplateFile[]> {
    const res = await this.ensureClient().send(
      new ListObjectsV2Command({
        Bucket: this.getBucket(),
        Prefix: prefix,
      }),
    );

    const objects = res.Contents ?? [];
    return objects
      .filter((o) => !!o.Key && o.Key !== prefix)
      .map((o) => {
        const key = o.Key as string;
        const id = key.slice(prefix.length);
        return {
          key,
          id,
          fileName: id,
          size: o.Size ?? 0,
          lastModified: o.LastModified ? o.LastModified.toISOString() : null,
          scope: 'system',
        };
      });
  }

  private mapTemplateToContractFile(row: {
    id: string;
    title: string;
    description: string | null;
    s3Key: string | null;
    scope: string;
    createdBy: string | null;
    updatedAt: Date;
    createdAt: Date;
    metadata: unknown;
    contentJSON?: unknown;
    mergeFields?: unknown;
    mimeType?: string | null;
    creator?: { name: string } | null;
  }): ContractTemplateFile {
    const meta = parseTemplateMeta(row.metadata);
    const fileName = meta.fileName || meta.legacyId || row.title;
    return {
      key: row.s3Key,
      id: row.id,
      fileName,
      name: row.title,
      description: row.description ?? undefined,
      size: meta.fileSize ?? 0,
      lastModified:
        row.updatedAt?.toISOString?.() ?? row.createdAt.toISOString(),
      scope: row.scope as TemplateScope,
      workspaceId: meta.workspaceId ?? null,
      createdBy: row.createdBy,
      creatorName: row.creator?.name ?? null,
      mimeType: row.mimeType ?? meta.mimeType ?? null,
      hasStructuredContent:
        !!row.contentJSON &&
        Array.isArray((row.mergeFields as unknown[] | undefined) ?? []),
      processingStatus: meta.processingStatus ?? null,
      publishStatus: meta.publishStatus ?? null,
    };
  }

  async list(
    scope: TemplateScope,
    userId: string,
  ): Promise<ContractTemplateFile[]> {
    const admin = await this.isAdmin(userId);

    if (scope === 'system') {
      const systemRows = await this.prisma.template.findMany({
        where: { scope: 'system' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          s3Key: true,
          scope: true,
          createdBy: true,
          updatedAt: true,
          createdAt: true,
          metadata: true,
          contentJSON: true,
          mergeFields: true,
          mimeType: true,
          creator: { select: { name: true } },
        },
      });
      if (systemRows.length > 0) {
        return systemRows.map((r) => this.mapTemplateToContractFile(r));
      }

      // Legacy fallback for old system objects that have no DB metadata yet.
      const [system, legacy] = await Promise.all([
        this.listForPrefix(SYSTEM_PREFIX),
        this.listForPrefix(LEGACY_SYSTEM_PREFIX),
      ]);
      const merged = new Map<string, ContractTemplateFile>();
      for (const f of [...system, ...legacy]) merged.set(f.key ?? f.id, f);
      return [...merged.values()];
    }

    const memberships =
      scope === 'community' || admin
        ? []
        : await this.prisma.workspaceMember.findMany({
            where: { userId },
            select: { workspaceId: true },
          });
    const memberWorkspaceIds = memberships.map((m) => m.workspaceId);

    const rows = await this.prisma.template.findMany({
      where: { scope },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        s3Key: true,
        scope: true,
        createdBy: true,
        updatedAt: true,
        createdAt: true,
        metadata: true,
        contentJSON: true,
        mergeFields: true,
        mimeType: true,
        creator: { select: { name: true } },
      },
    });
    const filtered =
      scope === 'community' || admin
        ? rows
        : rows.filter((r) => {
            const ws = parseTemplateMeta(r.metadata).workspaceId;
            return !!ws && memberWorkspaceIds.includes(ws);
          });
    return filtered.map((r) => this.mapTemplateToContractFile(r));
  }

  async uploadForScope(params: {
    scope: 'community' | 'internal';
    userId: string;
    workspaceId?: string;
    name: string; // display name (without extension)
    description?: string;
    ext: string;
    originalName?: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{
    key: string;
    id: string;
    name?: string;
    description?: string;
  }> {
    const creator = await this.usersService.findById(params.userId);
    if (params.scope === 'internal') {
      if (!creator) {
        throw new NotFoundException('User not found');
      }
      if (!params.workspaceId) {
        throw new NotFoundException('Workspace not found');
      }
      await this.workspaceAccess.requireMembership(
        params.workspaceId,
        params.userId,
      );
    }
    const client = this.ensureClient();
    const prefix = prefixForScope(params.scope);
    const safeBase = sanitizeBaseName(params.name) || 'template';
    const objectName = `${safeBase}-${randomUUID()}${params.ext}`;
    const key =
      params.scope === 'internal'
        ? `${prefix}${params.workspaceId}/${objectName}`
        : `${prefix}${objectName}`;

    const extracted = await extractContractTemplateText({
      buffer: params.buffer,
      fileName: params.originalName || `${safeBase}${params.ext}`,
      contentType: params.contentType,
    });
    const sanitized = await sanitizeContractTemplateFields({
      text: extracted.text,
      aiSanitizer: this.aiSanitizer,
      plainTextRedaction: true,
    });
    const structured = buildContractTemplateJson({
      text: sanitized.sanitizedText,
      mergeFields: sanitized.mergeFields,
      defaultTitle: params.name,
    });
    if (structured.contentJSON.content.length === 0) {
      throw new Error('Failed to build structured template content');
    }
    const nowIso = new Date().toISOString();

    await client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
        Metadata: {
          ...(sanitizeHeaderValue(params.name)
            ? { name: sanitizeHeaderValue(params.name)! }
            : {}),
          ...(sanitizeHeaderValue(params.description)
            ? { description: sanitizeHeaderValue(params.description)! }
            : {}),
        },
      }),
    );
    const safeTitle = removeAccents(params.name);
    try {
      const created = await this.prisma.template.create({
        data: {
          title: safeTitle,
          description: params.description,
          category: 'contract',
          scope: params.scope,
          s3Key: key,
          fileName: `${sanitizeBaseName(params.originalName || params.name)}${params.ext}`,
          fileSize: params.buffer.length,
          mimeType: extracted.detectedMimeType,
          contentJSON: structured.contentJSON as any,
          mergeFields: structured.mergeFields as any,
          metadata: {
            ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
            fileName: `${sanitizeBaseName(params.originalName || params.name)}${params.ext}`,
            fileSize: params.buffer.length,
            mimeType: extracted.detectedMimeType,
            sourceFileName: params.originalName || `${safeBase}${params.ext}`,
            processingStatus: 'ready',
            publishStatus: 'published',
            sanitizedFieldCount: sanitized.sanitizedFieldCount,
            structuredAt: nowIso,
          },
          createdBy: creator?.id,
        },
        select: { id: true },
      });
      return {
        key,
        id: created.id,
        name: params.name,
        description: params.description,
      };
    } catch (error) {
      await this.ensureClient().send(
        new DeleteObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        }),
      );
      throw error;
    }
  }

  private async resolveDownloadObjectKey(
    scope: TemplateScope,
    id: string,
    userId?: string,
  ): Promise<string> {
    const tmpl = await this.prisma.template.findUnique({
      where: { id },
      select: { id: true, s3Key: true, scope: true, metadata: true },
    });
    if (tmpl) {
      if (tmpl.scope !== scope) throw new NotFoundException('File not found');
      if (scope === 'internal' && userId) {
        const admin = await this.isAdmin(userId);
        if (!admin) {
          const workspaceId = parseTemplateMeta(tmpl.metadata).workspaceId;
          if (!workspaceId) throw new NotFoundException('File not found');
          const ok = await this.workspaceAccess.hasMembership(
            workspaceId,
            userId,
          );
          if (!ok) throw new NotFoundException('File not found');
        }
      }
      if (!tmpl.s3Key) throw new NotFoundException('File not found');
      return tmpl.s3Key;
    }
    // Legacy key compatibility
    return `${prefixForScope(scope)}${id}`;
  }

  async download(scope: TemplateScope, id: string, userId?: string) {
    const client = this.ensureClient();
    const key = await this.resolveDownloadObjectKey(scope, id, userId);
    try {
      return await client.send(
        new GetObjectCommand({
          Bucket: this.getBucket(),
          Key: key,
        }),
      );
    } catch (e: unknown) {
      // Backward-compat for system scope
      if (scope === 'system' && e instanceof Error && e.name === 'NoSuchKey') {
        const legacyKey = `${LEGACY_SYSTEM_PREFIX}${id}`;
        return client.send(
          new GetObjectCommand({
            Bucket: this.getBucket(),
            Key: legacyKey,
          }),
        );
      }
      throw e;
    }
  }

  async deleteTemplate(
    scope: 'community' | 'internal',
    id: string,
    userId: string,
  ): Promise<void> {
    const tmpl = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true,
        s3Key: true,
        createdBy: true,
        metadata: true,
      },
    });
    if (!tmpl || tmpl.scope !== scope) {
      throw new NotFoundException('Template not found');
    }
    const admin = await this.isAdmin(userId);
    const isCreator = tmpl.createdBy === userId;
    if (!admin && !isCreator) {
      throw new ForbiddenException('No permission to delete this template');
    }
    const workspaceId = parseTemplateMeta(tmpl.metadata).workspaceId;
    if (scope === 'internal' && !admin && workspaceId) {
      const ok = await this.workspaceAccess.hasMembership(workspaceId, userId);
      if (!ok) throw new NotFoundException('Template not found');
    }
    if (tmpl.s3Key) {
      await this.ensureClient().send(
        new DeleteObjectCommand({
          Bucket: this.getBucket(),
          Key: tmpl.s3Key,
        }),
      );
    }
    await this.prisma.template.delete({ where: { id } });
  }

  async deleteCommunity(id: string, userId: string): Promise<void> {
    return this.deleteTemplate('community', id, userId);
  }

  async deleteInternal(id: string, userId: string): Promise<void> {
    return this.deleteTemplate('internal', id, userId);
  }

  async getTemplateByIdForScope(
    scope: TemplateScope,
    id: string,
    userId: string,
  ): Promise<{ fileName: string; mimeType: string }> {
    const tmpl = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true,
        metadata: true,
      },
    });
    if (!tmpl || tmpl.scope !== scope) {
      throw new NotFoundException('Template not found');
    }
    const meta = parseTemplateMeta(tmpl.metadata);
    if (scope === 'internal') {
      const admin = await this.isAdmin(userId);
      if (!admin) {
        if (!meta.workspaceId) {
          throw new NotFoundException('Template not found');
        }
        const ok = await this.workspaceAccess.hasMembership(
          meta.workspaceId,
          userId,
        );
        if (!ok) throw new NotFoundException('Template not found');
      }
    }
    return {
      fileName: meta.fileName || 'template',
      mimeType: meta.mimeType || 'application/octet-stream',
    };
  }

  async getTemplateBuffer(
    scope: TemplateScope,
    id: string,
    userId?: string,
  ): Promise<{
    fileName: string;
    contentType: string;
    size: number;
    buffer: Buffer;
  }> {
    const obj = await this.download(scope, id, userId);
    const body = obj.Body as AsyncIterable<Uint8Array> | undefined;
    if (!body) throw new Error('Template file not found');

    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const contentType = obj.ContentType || 'application/octet-stream';

    let fileName = id;
    if (userId) {
      try {
        const meta = await this.getTemplateByIdForScope(scope, id, userId);
        fileName = meta.fileName || id;
      } catch {
        // fallback to id for legacy objects
      }
    }
    return { fileName, contentType, size: buffer.length, buffer };
  }

  async getStructuredTemplateForScope(
    scope: Extract<TemplateScope, 'community' | 'internal'>,
    id: string,
    userId: string,
  ): Promise<StructuredContractTemplate> {
    const row = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        scope: true,
        contentJSON: true,
        mergeFields: true,
        metadata: true,
      },
    });
    if (!row || row.scope !== scope) {
      throw new NotFoundException('Template not found');
    }
    if (scope === 'internal') {
      const meta = parseTemplateMeta(row.metadata);
      const admin = await this.isAdmin(userId);
      if (!admin) {
        if (!meta.workspaceId) {
          throw new NotFoundException('Template not found');
        }
        const hasMembership = await this.workspaceAccess.hasMembership(
          meta.workspaceId,
          userId,
        );
        if (!hasMembership) {
          throw new NotFoundException('Template not found');
        }
      }
    }
    if (
      !row.contentJSON ||
      typeof row.contentJSON !== 'object' ||
      !Array.isArray((row.mergeFields as unknown[] | undefined) ?? [])
    ) {
      throw new NotFoundException('Structured template not found');
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      scope,
      contentJSON: row.contentJSON as unknown as StructuredContractTemplate['contentJSON'],
      mergeFields:
        row.mergeFields as unknown as StructuredContractTemplate['mergeFields'],
      metadata: parseTemplateMeta(row.metadata),
    };
  }
}
