import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
