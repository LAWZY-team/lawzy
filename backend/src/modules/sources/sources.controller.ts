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
    @Query('includeSystem') includeSystem?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.sourcesService.findByWorkspace(workspaceId, {
      page,
      limit,
      userId: req.user.userId,
      includeSystem: includeSystem === 'true',
    });
  }

  /**
   * Lawzy system/premium sources visible to this workspace per plan (read-only list).
   */
  @Get('lawzy-catalog')
  async lawzyCatalog(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!workspaceId?.trim()) {
      throw new BadRequestException('workspaceId is required');
    }
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 30;
    return this.sourcesService.findLawzyCatalog(
      workspaceId.trim(),
      req.user.userId,
      { page, limit },
    );
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
    @Body('sourceUrl') sourceUrl?: string,
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
      sourceUrl: sourceUrl?.trim(),
    });
  }

  @Post('semantic-search')
  async semanticSearch(
    @Request() req: any,
    @Body()
    body: {
      query: string;
      workspaceId: string;
      topK?: number;
      includeSystemSources?: boolean;
      sourceIds?: string[];
    },
  ) {
    if (!body.query?.trim()) {
      throw new BadRequestException('query is required');
    }
    if (!body.workspaceId?.trim()) {
      throw new BadRequestException('workspaceId is required');
    }
    return this.sourcesService.semanticSearch({
      query: body.query.trim(),
      workspaceId: body.workspaceId.trim(),
      userId: req.user.userId,
      topK: body.topK,
      includeSystemSources: body.includeSystemSources,
      sourceIds: body.sourceIds,
    });
  }

  @Post(':id/reprocess')
  async reprocess(@Request() req: any, @Param('id') id: string) {
    return this.sourcesService.reprocessSource(id, req.user.userId);
  }

  @Get(':id')
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.sourcesService.findById(id, req.user.userId);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.sourcesService.delete(id, req.user.userId);
  }
}
