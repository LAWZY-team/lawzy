import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../integrations/prisma/prisma.service';

const ARTICLE_TYPES = ['news', 'policy', 'document', 'announcement'] as const;
const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;

/** Slugify title - supports Vietnamese by removing diacritics */
function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'article'
  );
}

export type ArticleType = (typeof ARTICLE_TYPES)[number];
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
    q?: string;
    isAdmin?: boolean;
  }) {
    const page = opts?.page ?? 1;
    const limit = Math.min(opts?.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (opts?.type && ARTICLE_TYPES.includes(opts.type as ArticleType)) {
      where.type = opts.type;
    }

    if (
      opts?.status &&
      ARTICLE_STATUSES.includes(opts.status as ArticleStatus)
    ) {
      where.status = opts.status;
    } else if (!opts?.isAdmin) {
      where.status = 'published';
    }

    if (opts?.q?.trim()) {
      const search = opts.q.trim();
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { contentText: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug, status: 'published' },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(data: {
    type: string;
    title: string;
    slug?: string;
    excerpt?: string;
    content?: unknown;
    contentText?: string;
    coverImage?: string;
    status?: string;
    publishedAt?: Date | null;
    authorId?: string;
    metadata?: unknown;
  }) {
    let slug = data.slug?.trim() || slugify(data.title);
    slug = slug || 'article';

    const existing = await this.prisma.article.findUnique({
      where: { slug },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const status = ARTICLE_STATUSES.includes(
      (data.status as ArticleStatus) ?? 'draft',
    )
      ? (data.status as ArticleStatus)
      : 'draft';

    const type = ARTICLE_TYPES.includes((data.type as ArticleType) ?? 'news')
      ? (data.type as ArticleType)
      : 'news';

    try {
      return await this.prisma.article.create({
      data: {
        type,
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content
          ? JSON.parse(JSON.stringify(data.content))
          : undefined,
        contentText: data.contentText,
        coverImage: data.coverImage,
        status,
        publishedAt:
          data.publishedAt ?? (status === 'published' ? new Date() : null),
        authorId: data.authorId,
        metadata: data.metadata
          ? JSON.parse(JSON.stringify(data.metadata))
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'Slug đã tồn tại. Vui lòng thử lại hoặc đổi tiêu đề.',
          );
        }
      }
      throw err;
    }
  }

  async update(
    id: string,
    data: {
      type?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: unknown;
      contentText?: string;
      coverImage?: string;
      status?: string;
      publishedAt?: Date | null | undefined;
      metadata?: unknown;
    },
  ) {
    await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined)
      updateData.type = ARTICLE_TYPES.includes(data.type as ArticleType)
        ? data.type
        : undefined;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.slug !== undefined)
      updateData.slug = data.slug.trim() || undefined;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined)
      updateData.content = JSON.parse(JSON.stringify(data.content));
    if (data.contentText !== undefined)
      updateData.contentText = data.contentText;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.status !== undefined)
      updateData.status = ARTICLE_STATUSES.includes(
        data.status as ArticleStatus,
      )
        ? data.status
        : undefined;
    if (data.publishedAt !== undefined)
      updateData.publishedAt = data.publishedAt;
    if (data.metadata !== undefined)
      updateData.metadata = JSON.parse(JSON.stringify(data.metadata));

    return this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.article.delete({ where: { id } });
    return { success: true };
  }
}
