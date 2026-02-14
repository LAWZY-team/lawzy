import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { extname } from 'node:path';
import { ContractTemplatesService } from './contract-templates.service';
import type { TemplateScope } from './contract-templates.types';

function parseScope(scope: string): TemplateScope {
  if (scope === 'system' || scope === 'community') return scope;
  throw new BadRequestException('Invalid scope. Must be system|community');
}

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);

@Controller('contract-templates')
export class ContractTemplatesController {
  constructor(private readonly service: ContractTemplatesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Query('scope') scopeRaw: string) {
    const scope = parseScope(scopeRaw);
    const files = await this.service.list(scope);
    return { scope, files };
  }

  @Post('community')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname || '').toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
          return cb(new Error('Only PDF, DOC, DOCX are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCommunity(
    @UploadedFile() file?: Express.Multer.File,
    @Body('name') nameRaw?: string,
    @Body('description') descriptionRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException('Only PDF, DOC, DOCX are allowed');
    }

    const defaultName = (file.originalname || 'template')
      .replace(ext, '')
      .trim();
    const name = (nameRaw ?? defaultName).trim();
    if (!name) throw new BadRequestException('Name is required');
    if (name.length > 120) {
      throw new BadRequestException('Name is too long (max 120 chars)');
    }
    const description = (descriptionRaw ?? '').trim();
    if (description.length > 300) {
      throw new BadRequestException('Description is too long (max 300 chars)');
    }

    const result = await this.service.uploadCommunity({
      name,
      description: description || undefined,
      ext,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
    return {
      id: result.id,
      key: result.key,
      name: result.name,
      description: result.description,
      originalName: file.originalname,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  @Get(':scope/:id/download')
  async download(
    @Param('scope') scopeRaw: string,
    @Param('id') id: string,
    @Query('inline') inlineRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scope = parseScope(scopeRaw);
    try {
      const obj = await this.service.download(scope, id);
      const body = obj.Body;
      if (!body) throw new NotFoundException('File not found');

      const inline = inlineRaw === '1' || inlineRaw === 'true';
      const dispositionType = inline ? 'inline' : 'attachment';
      res.set({
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${id}"`,
      });
      return new StreamableFile(body as unknown as Uint8Array);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'NoSuchKey') {
        throw new NotFoundException('File not found');
      }
      throw e;
    }
  }

  @Delete('community/:id')
  async deleteCommunity(@Param('id') id: string) {
    await this.service.deleteCommunity(id);
    return { success: true };
  }
}
