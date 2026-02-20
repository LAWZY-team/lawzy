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
    @Query('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const opts = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
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

  @Get('storage/:workspaceId')
  async getStorageUsed(@Param('workspaceId') workspaceId: string) {
    return this.filesService.getStorageUsed(workspaceId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.filesService.findById(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string) {
    const { body, contentType, name } =
      await this.filesService.getDownloadStream(id);
    if (!body) {
      return { message: 'File not found' };
    }
    const buffer = await this.streamToBuffer(body);
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: `attachment; filename="${encodeURIComponent(name)}"`,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.filesService.delete(id);
  }

  private async streamToBuffer(
    stream: AsyncIterable<Uint8Array> | { transformToWebStream?: () => unknown },
  ): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
