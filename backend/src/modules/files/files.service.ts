import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { getR2Env } from '../../config/env';
import { PrismaService } from '../../integrations/prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
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

  async upload(data: {
    file: Express.Multer.File;
    userId: string;
    workspaceId: string;
  }) {
    const client = this.ensureClient();
    const bucket = this.getBucket();
    const uuid = randomUUID();
    const originalName = data.file.originalname || 'file';
    const key = `uploads/${data.workspaceId}/${uuid}-${originalName}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data.file.buffer,
        ContentType: data.file.mimetype || 'application/octet-stream',
      }),
    );

    const file = await this.prisma.file.create({
      data: {
        name: originalName,
        size: data.file.size,
        mimeType: data.file.mimetype || 'application/octet-stream',
        s3Key: key,
        userId: data.userId,
        workspaceId: data.workspaceId,
      },
    });

    return file;
  }

  async findByWorkspace(
    workspaceId: string,
    opts?: { page?: number; limit?: number },
  ) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where: { workspaceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, avatar: true } },
        },
      }),
      this.prisma.file.count({ where: { workspaceId } }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, avatar: true } },
      },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getDownloadStream(id: string) {
    const file = await this.findById(id);
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

  async delete(id: string) {
    const file = await this.findById(id);
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

  async getStorageUsed(workspaceId: string) {
    const result = await this.prisma.file.aggregate({
      where: { workspaceId },
      _sum: { size: true },
    });
    return { bytes: result._sum.size ?? 0 };
  }
}
