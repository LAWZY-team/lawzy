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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SourcesService } from './sources.service';
import { PrismaService } from '../../integrations/prisma/prisma.service';

@Controller('admin/sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSourcesController {
  constructor(
    private readonly sourcesService: SourcesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
    @Query('scope') scope?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const skip = (page - 1) * limit;

    const where = scope ? { scope } : {};

    const [data, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          workspace: { select: { id: true, name: true } },
        },
      }),
      this.prisma.source.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async createSystemSource(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('type') type: string,
    @Body('scope') scope: string,
    @Body('tags') tagsRaw?: string,
    @Body('sourceUrl') sourceUrl?: string,
  ) {
    if (!title?.trim()) {
      throw new BadRequestException('title is required');
    }

    const validScopes = ['system', 'premium'];
    const resolvedScope = validScopes.includes(scope) ? scope : 'system';

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
      userId: req.user.userId,
      workspaceId: '',
      file,
      tags,
      sourceUrl: sourceUrl?.trim(),
      scope: resolvedScope,
    });
  }

  @Post(':id/reprocess')
  async reprocess(@Param('id') id: string) {
    return this.sourcesService.reprocessSource(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.sourcesService.delete(id);
  }
}
