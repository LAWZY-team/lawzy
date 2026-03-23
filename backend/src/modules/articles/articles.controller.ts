import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { UseInterceptors } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesStorageService } from './articles-storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly articlesStorage: ArticlesStorageService,
  ) {}

  @Get()
  async list(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.articlesService.findAll({
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      q,
      isAdmin: false,
    });
  }

  @Get('by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    if (!slug?.trim()) throw new BadRequestException('Slug required');
    return this.articlesService.findBySlug(slug);
  }

  @Get('serve-image')
  async serveImage(@Query('k') key: string, @Res() res: Response) {
    if (!key?.trim()) {
      throw new BadRequestException('Missing key');
    }
    const decodedKey = decodeURIComponent(key);
    const { body, contentType } =
      await this.articlesStorage.getImageStream(decodedKey);
    if (!body) {
      return res.status(HttpStatus.NOT_FOUND).send('Not found');
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    body.pipe(res);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.articlesService.findById(id);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.articlesStorage.uploadImage(file);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(
    @Request() req: any,
    @Body()
    body: {
      type?: string;
      title: string;
      slug?: string;
      excerpt?: string;
      content?: unknown;
      contentText?: string;
      coverImage?: string;
      status?: string;
      publishedAt?: string | null;
      metadata?: unknown;
    },
  ) {
    if (!body?.title?.trim()) {
      throw new BadRequestException('Title is required');
    }
    const publishedAt = body.publishedAt
      ? new Date(body.publishedAt)
      : undefined;
    return this.articlesService.create({
      type: body.type ?? 'news',
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      contentText: body.contentText,
      coverImage: body.coverImage,
      status: body.status,
      publishedAt,
      authorId: req.user?.userId,
      metadata: body.metadata,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      type?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      content?: unknown;
      contentText?: string;
      coverImage?: string;
      status?: string;
      publishedAt?: string | null;
      metadata?: unknown;
    },
  ) {
    const publishedAt =
      body.publishedAt !== undefined
        ? body.publishedAt
          ? new Date(body.publishedAt)
          : null
        : undefined;
    return this.articlesService.update(id, {
      ...body,
      publishedAt,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }
}

@Controller('admin/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  async list(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.articlesService.findAll({
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      q,
      isAdmin: true,
    });
  }
}
