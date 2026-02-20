import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { getR2Env } from '../../config/env';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';

@Injectable()
export class SourcesService {
  private readonly bucket = getR2Env().bucket;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client,
  ) {}

  async create(data: {
    title: string;
    type: string;
    userId: string;
    workspaceId: string;
    file?: Express.Multer.File;
    tags?: string[];
  }) {
    const uuid = randomUUID();
    let s3Key: string | null = null;

    if (data.file) {
      if (!this.s3) {
        throw new BadRequestException('File storage is not configured');
      }
      const filename = data.file.originalname || 'file';
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      s3Key = `sources/${data.workspaceId}/${uuid}-${safeName}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: data.file.buffer,
          ContentType: data.file.mimetype || 'application/octet-stream',
        }),
      );
    }

    return this.prisma.source.create({
      data: {
        title: data.title,
        type: data.type || 'pdf',
        status: 'completed',
        s3Key,
        userId: data.userId,
        workspaceId: data.workspaceId,
        tags: data.tags ? (data.tags as Prisma.InputJsonValue) : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async findByWorkspace(
    workspaceId: string,
    opts?: { page?: number; limit?: number },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.source.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.source.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
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

    return source;
  }

  async delete(id: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    if (source.s3Key && this.s3) {
      await this.s3.send(
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
}
