import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Res,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { R2_S3_CLIENT } from '../../integrations/r2/r2.constants';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Env } from '../../config/env';
import {
  extractTrackedChangeIds,
  applyTrackedEdits,
  resolveTrackedChange,
} from '../../utils/docx-tracked-changes';

@UseGuards(JwtAuthGuard)
@Controller('single-documents')
export class SingleDocumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly sourceProcessingService: SourceProcessingService,
    private readonly workspaceAccess: WorkspaceAccessService,
    @Inject(R2_S3_CLIENT) private readonly s3: S3Client | null,
  ) {}

  private async streamToBuffer(
    stream: any,
  ): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private mapDocumentToFrontend(doc: any): any {
    const file = doc.files && doc.files.length > 0 ? doc.files[0] : null;

    let lpmsStatus: 'pending' | 'processing' | 'ready' | 'error' = 'ready';
    if (doc.status === 'processing') lpmsStatus = 'processing';
    else if (doc.status === 'error') lpmsStatus = 'error';
    else if (doc.status === 'draft') lpmsStatus = 'pending';
    else if (doc.status === 'completed') lpmsStatus = 'ready';

    const fileType = file ? file.name.split('.').pop()?.toLowerCase() || null : null;

    return {
      id: doc.id,
      user_id: doc.createdBy,
      project_id: doc.projectId,
      filename: doc.title,
      file_type: fileType,
      storage_path: file ? file.s3Key : null,
      pdf_storage_path: fileType === 'pdf' ? (file ? file.s3Key : null) : null,
      size_bytes: file ? file.size : null,
      page_count: null,
      status: lpmsStatus,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
      active_version_number: doc.versions ? doc.versions.length : 1,
    };
  }

  @Get()
  async list(@Request() req: any) {
    const userId = req.user.userId;
    const docs = await this.prisma.document.findMany({
      where: {
        createdBy: userId,
        projectId: null,
        deletedAt: null,
      },
      include: {
        files: true,
        versions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return docs.map(d => this.mapDocumentToFrontend(d));
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const userId = req.user.userId;
    const workspaceId = await this.workspaceAccess.getUserFirstWorkspaceId(userId);
    if (!workspaceId) {
      throw new BadRequestException('User does not belong to any workspace');
    }

    const doc = await this.prisma.document.create({
      data: {
        title: file.originalname,
        type: 'contract',
        status: 'processing',
        visibility: 'workspace',
        workspaceId,
        createdBy: userId,
      },
    });

    try {
      const fileRecord = await this.filesService.upload({
        file,
        userId,
        workspaceId,
        category: 'input_upload',
        documentId: doc.id,
      });

      const fileExt = file.originalname.split('.').pop()?.toLowerCase() || '';
      const extractionResult = await this.sourceProcessingService.extractText({
        type: fileExt,
        s3Key: fileRecord.s3Key,
        sourceUrl: null,
      });

      const contentJSON = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: extractionResult.text,
              },
            ],
          },
        ],
      };

      const metadata = {
        extractedText: extractionResult.text,
      };

      await this.prisma.document.update({
        where: { id: doc.id },
        data: {
          status: 'completed',
          contentJSON: contentJSON as any,
          metadata: metadata as any,
        },
      });

      await this.prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          createdBy: userId,
          label: 'Initial Upload',
          contentJSON: contentJSON as any,
        },
      });

      const updatedDoc = await this.prisma.document.findUnique({
        where: { id: doc.id },
        include: {
          files: true,
          versions: true,
        },
      });

      return this.mapDocumentToFrontend(updatedDoc);
    } catch (e) {
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: 'error' },
      });
      throw e;
    }
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { files: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    for (const f of doc.files) {
      await this.filesService.delete(f.id, userId);
    }
    await this.prisma.document.delete({
      where: { id },
    });
    return { success: true };
  }

  @Get(':id/url')
  async getUrl(@Request() req: any, @Param('id') id: string, @Query('version_id') versionId?: string) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { versions: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    const activeVersionId = versionId || (doc.versions && doc.versions.length > 0 ? doc.versions[doc.versions.length - 1].id : null);
    const qs = versionId ? `?version_id=${encodeURIComponent(versionId)}` : '';
    return {
      url: `/api/proxy/single-documents/${id}/display${qs}`,
      filename: doc.title,
      version_id: activeVersionId,
    };
  }

  @Get(':id/docx')
  async serveDocx(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { files: true },
    });
    if (!doc || !doc.files || doc.files.length === 0) {
      throw new NotFoundException('No file found for this document');
    }
    const file = doc.files[0];
    const { body, contentType, name } = await this.filesService.getDownloadStream(file.id, userId);
    if (!body) {
      throw new NotFoundException('File not found in S3');
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`
    );
    for await (const chunk of body as any) {
      res.write(chunk);
    }
    res.end();
  }

  @Get(':id/display')
  async serveDisplay(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.serveDocx(req, id, res);
  }

  @Get(':id/versions')
  async listVersions(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { versions: true },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    const versions = doc.versions.map((v, idx) => ({
      id: v.id,
      version_number: idx + 1,
      source: 'upload' as const,
      created_at: v.createdAt.toISOString(),
    }));
    return {
      current_version_id: versions[versions.length - 1]?.id ?? null,
      versions,
    };
  }

  @Get(':id/tracked-change-ids')
  async getTrackedChangeIds(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { files: true },
    });
    if (!doc || !doc.files || doc.files.length === 0) {
      throw new NotFoundException('No file found');
    }
    const file = doc.files[0];
    const { body } = await this.filesService.getDownloadStream(file.id, userId);
    if (!body) {
      throw new NotFoundException('File not found in S3');
    }
    const buffer = await this.streamToBuffer(body);
    const ids = await extractTrackedChangeIds(buffer);
    return { ids };
  }

  @Post(':id/edits/:editId/accept')
  async acceptEdit(
    @Request() req: any,
    @Param('id') id: string,
    @Param('editId') editId: string,
  ) {
    return this.resolveEdit(req, id, editId, 'accept');
  }

  @Post(':id/edits/:editId/reject')
  async rejectEdit(
    @Request() req: any,
    @Param('id') id: string,
    @Param('editId') editId: string,
  ) {
    return this.resolveEdit(req, id, editId, 'reject');
  }

  private async resolveEdit(
    req: any,
    id: string,
    editId: string,
    mode: 'accept' | 'reject',
  ) {
    const userId = req.user.userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, createdBy: userId },
      include: { files: true, versions: true },
    });
    if (!doc || !doc.files || doc.files.length === 0) {
      throw new NotFoundException('Document or file not found');
    }
    const file = doc.files[0];
    const { body } = await this.filesService.getDownloadStream(file.id, userId);
    if (!body) {
      throw new NotFoundException('File not found in S3');
    }
    const buffer = await this.streamToBuffer(body);
    const { bytes: resolvedBytes, found } = await resolveTrackedChange(
      buffer,
      [editId],
      mode,
    );

    if (!found) {
      return {
        ok: true,
        status: mode === 'accept' ? 'accepted' : 'rejected',
        version_id: doc.versions[doc.versions.length - 1]?.id ?? null,
        download_url: `/api/proxy/single-documents/${id}/display`,
      };
    }

    if (!this.s3) {
      throw new Error('R2/S3 is not configured');
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: getR2Env().bucket,
        Key: file.s3Key,
        Body: resolvedBytes,
        ContentType: file.mimeType,
      }),
    );

    // Re-extract text from resolved file
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const extractionResult = await this.sourceProcessingService.extractText({
      type: fileExt,
      s3Key: file.s3Key,
      sourceUrl: null,
    });

    const contentJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: extractionResult.text,
            },
          ],
        },
      ],
    };

    const metadata = {
      extractedText: extractionResult.text,
    };

    await this.prisma.document.update({
      where: { id: doc.id },
      data: {
        contentJSON: contentJSON as any,
        metadata: metadata as any,
      },
    });

    return {
      ok: true,
      status: mode === 'accept' ? 'accepted' : 'rejected',
      version_id: doc.versions[doc.versions.length - 1]?.id ?? null,
      download_url: `/api/proxy/single-documents/${id}/display`,
    };
  }

  @Post('download-zip')
  async downloadZip(@Request() req: any, @Body('document_ids') documentIds: string[], @Res() res: Response) {
    if (!documentIds || documentIds.length === 0) {
      throw new BadRequestException('document_ids is required');
    }
    const userId = req.user.userId;
    const docs = await this.prisma.document.findMany({
      where: { id: { in: documentIds }, createdBy: userId },
      include: { files: true },
    });

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const doc of docs) {
      if (doc.files && doc.files.length > 0) {
        const file = doc.files[0];
        const { body } = await this.filesService.getDownloadStream(file.id, userId);
        if (body) {
          const buffer = await this.streamToBuffer(body);
          zip.file(file.name, buffer);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="documents.zip"');
    res.send(content);
  }
}
