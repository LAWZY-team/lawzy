import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('filterByUserId') filterByUserId?: string,
    @Query('documentId') documentId?: string,
    @Query('category') category?: 'input_upload' | 'template' | 'export_output',
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const opts = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      userId: req.user.userId,
      filterByUserId: filterByUserId || undefined,
      documentId: documentId || undefined,
      category: category || undefined,
    };
    return this.filesService.findByWorkspace(workspaceId, opts);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('workspaceId') workspaceId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const userId = req.user.userId;
    return this.filesService.upload({
      file,
      userId,
      workspaceId,
    });
  }

  @Post('upload-export')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadExport(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('workspaceId') workspaceId: string,
    @Body('documentId') documentId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const userId = req.user.userId;
    return this.filesService.upload({
      file,
      userId,
      workspaceId,
      category: 'export_output',
      documentId: documentId || null,
    });
  }

  @Get('storage/:workspaceId')
  async getStorageUsed(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.filesService.getStorageUsed(
      workspaceId,
      req.user.userId,
    );
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.filesService.findById(id, req.user.userId);
  }

  @Get(':id/download')
  async download(@Request() req: any, @Param('id') id: string) {
    const { body, contentType, name } =
      await this.filesService.getDownloadStream(id, req.user.userId);
    if (!body) {
      return { message: 'File not found' };
    }
    const buffer = await this.streamToBuffer(body);
    return new StreamableFile(buffer, {
      type: contentType,
      // RFC 5987 for UTF-8 filenames (better cross-browser behavior).
      disposition: `attachment; filename="${this.asciiFallbackFilename(
        name,
      )}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    });
  }

  private asciiFallbackFilename(name: string): string {
    const base = (name || 'file')
      .replace(/[\r\n"]/g, '')
      .replace(/[^\x20-\x7E]/g, '_')
      .trim();
    return base || 'file';
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.filesService.delete(id, req.user.userId);
  }

  private async streamToBuffer(
    stream:
      | AsyncIterable<Uint8Array>
      | { transformToWebStream?: () => unknown },
  ): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
