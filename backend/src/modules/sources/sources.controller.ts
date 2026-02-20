import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SourcesService } from './sources.service';

@UseGuards(JwtAuthGuard)
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.sourcesService.findByWorkspace(workspaceId, { page, limit });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async create(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('type') type: string,
    @Body('workspaceId') workspaceId: string,
    @Body('tags') tagsRaw?: string,
  ) {
    const userId = req.user.userId;
    if (!title?.trim()) {
      throw new BadRequestException('title is required');
    }
    if (!workspaceId?.trim()) {
      throw new BadRequestException('workspaceId is required');
    }

    let tags: string[] | undefined;
    if (tagsRaw) {
      try {
        tags = typeof tagsRaw === 'string' ? JSON.parse(tagsRaw) : tagsRaw;
        if (!Array.isArray(tags)) tags = undefined;
      } catch {
        tags = undefined;
      }
    }

    return this.sourcesService.create({
      title: title.trim(),
      type: (type || 'pdf').trim(),
      userId,
      workspaceId: workspaceId.trim(),
      file,
      tags,
    });
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.sourcesService.findById(id);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.sourcesService.delete(id);
  }
}
