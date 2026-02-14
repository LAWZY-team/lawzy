import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getR2Env } from '../../config/env';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import type {
  ContractTemplateFile,
  TemplateScope,
} from './contract-templates.types';

const SYSTEM_PREFIX = 'templates/system/';
const COMMUNITY_PREFIX = 'templates/community/';
// Backward-compat: some existing objects may already be stored directly under `templates/`
// (as seen in Cloudflare UI when browsing the `templates/` prefix).
const LEGACY_SYSTEM_PREFIX = 'templates/';

function prefixForScope(scope: TemplateScope): string {
  return scope === 'system' ? SYSTEM_PREFIX : COMMUNITY_PREFIX;
}

function sanitizeBaseName(input: string): string {
  const trimmed = input.trim();
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

@Injectable()
export class ContractTemplatesService {
  private readonly bucket = getR2Env().bucket;

  constructor(@Inject(R2_S3_CLIENT) private readonly s3: S3Client) {}

  private async headMetadata(
    key: string,
  ): Promise<{ name?: string; description?: string }> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
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
    const res = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
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
        };
      });
  }

  async list(scope: TemplateScope): Promise<ContractTemplateFile[]> {
    if (scope === 'system') {
      const [system, legacy] = await Promise.all([
        this.listForPrefix(SYSTEM_PREFIX),
        this.listForPrefix(LEGACY_SYSTEM_PREFIX),
      ]);
      // De-dup by object key (in case you later move objects into templates/system/)
      const merged = new Map<string, ContractTemplateFile>();
      for (const f of [...system, ...legacy]) merged.set(f.key, f);
      return [...merged.values()].sort((a, b) =>
        (b.lastModified ?? '').localeCompare(a.lastModified ?? ''),
      );
    }

    const prefix = prefixForScope(scope);
    const community = await this.listForPrefix(prefix);
    // Enrich community files with metadata (name/description) stored on object.
    const enriched = await Promise.all(
      community.map(async (f) => {
        const meta = await this.headMetadata(f.key);
        return { ...f, ...meta };
      }),
    );
    return enriched.sort((a, b) =>
      (b.lastModified ?? '').localeCompare(a.lastModified ?? ''),
    );
  }

  private async keyExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        (e.name === 'NotFound' || e.name === 'NoSuchKey')
      ) {
        return false;
      }
      return false;
    }
  }

  private async findAvailableId(
    baseName: string,
    ext: string,
  ): Promise<string> {
    const safeBase = sanitizeBaseName(baseName) || 'template';
    for (let i = 0; i < 200; i++) {
      const suffix = i === 0 ? '' : `-${i + 1}`;
      const id = `${safeBase}${suffix}${ext}`;
      const key = `${COMMUNITY_PREFIX}${id}`;
      const exists = await this.keyExists(key);
      if (!exists) return id;
    }
    // Fallback
    return `${safeBase}-${Date.now()}${ext}`;
  }

  async uploadCommunity(params: {
    name: string; // display name (without extension)
    description?: string;
    ext: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{
    key: string;
    id: string;
    name?: string;
    description?: string;
  }> {
    const prefix = COMMUNITY_PREFIX;
    const id = await this.findAvailableId(params.name, params.ext);
    const key = `${prefix}${id}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
        Metadata: {
          name: params.name,
          ...(params.description ? { description: params.description } : {}),
        },
      }),
    );
    return { key, id, name: params.name, description: params.description };
  }

  async download(scope: TemplateScope, id: string) {
    const key = `${prefixForScope(scope)}${id}`;
    try {
      return await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (e: unknown) {
      // Backward-compat for system scope
      if (scope === 'system' && e instanceof Error && e.name === 'NoSuchKey') {
        const legacyKey = `${LEGACY_SYSTEM_PREFIX}${id}`;
        return this.s3.send(
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: legacyKey,
          }),
        );
      }
      throw e;
    }
  }

  async deleteCommunity(id: string): Promise<void> {
    const key = `${COMMUNITY_PREFIX}${id}`;
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
