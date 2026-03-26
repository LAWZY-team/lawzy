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
  Request,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContractTemplatesService } from './contract-templates.service';
import type { TemplateScope } from './contract-templates.types';
import { FilesService } from '../files/files.service';
import type { Request as ExpressRequest } from 'express';

type AuthRequest = ExpressRequest & { user: { userId: string } };

function parseScope(scope: string): TemplateScope {
  if (scope === 'system' || scope === 'community' || scope === 'internal') {
    return scope;
  }
  throw new BadRequestException(
    'Invalid scope. Must be system|community|internal',
  );
}

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);
function sanitizeFilenameForHeader(input: string): string {
  if (!input) return 'download';
  // Loại bỏ ký tự xuống dòng và ký tự ngoài ASCII cơ bản
  let cleaned = input.replace(/[\r\n]/g, ' ').replace(/[^\x20-\x7E]/g, '_');
  // Tránh dấu ngoặc kép phá vỡ header
  cleaned = cleaned.replace(/"/g, "'");
  cleaned = cleaned.trim();
  return cleaned.length ? cleaned : 'download';
}
@Controller('contract-templates')
export class ContractTemplatesController {
  constructor(
    private readonly service: ContractTemplatesService,
    private readonly filesService: FilesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  async list(@Request() req: AuthRequest, @Query('scope') scopeRaw: string) {
    const scope = parseScope(scopeRaw);
    const files = await this.service.list(scope, req.user.userId);
    return { scope, files };
  }

  @Post('community')
  @UseGuards(JwtAuthGuard)
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
    @Request() req: AuthRequest,
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
    const result = await this.service.uploadForScope({
      scope: 'community',
      userId: req.user.userId,
      name,
      description: description || undefined,
      ext,
      originalName: file.originalname,
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

  @Post('internal')
  @UseGuards(JwtAuthGuard)
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
  async uploadInternal(
    @Request() req: AuthRequest,
    @UploadedFile() file?: Express.Multer.File,
    @Body('name') nameRaw?: string,
    @Body('description') descriptionRaw?: string,
    @Body('workspaceId') workspaceId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const ext = extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException('Only PDF, DOC, DOCX are allowed');
    }
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const defaultName = (file.originalname || 'template')
      .replace(ext, '')
      .trim();
    const name = (nameRaw ?? defaultName).trim();
    if (!name) throw new BadRequestException('Name is required');
    const description = (descriptionRaw ?? '').trim();

    const result = await this.service.uploadForScope({
      scope: 'internal',
      userId: req.user.userId,
      workspaceId,
      name,
      description: description || undefined,
      ext,
      originalName: file.originalname,
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
  @UseGuards(JwtAuthGuard)
  async download(
    @Request() req: AuthRequest,
    @Param('scope') scopeRaw: string,
    @Param('id') id: string,
    @Query('inline') inlineRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const scope = parseScope(scopeRaw);
    try {
      const obj = await this.service.download(scope, id, req.user?.userId);
      const body = obj.Body;
      if (!body) throw new NotFoundException('File not found');

      const inline = inlineRaw === '1' || inlineRaw === 'true';
      const dispositionType = inline ? 'inline' : 'attachment';
      res.set({
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${sanitizeFilenameForHeader(id)}"`,
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
  @UseGuards(JwtAuthGuard)
  async deleteCommunity(@Request() req: AuthRequest, @Param('id') id: string) {
    await this.service.deleteCommunity(id, req.user.userId);
    return { success: true };
  }

  @Delete('internal/:id')
  @UseGuards(JwtAuthGuard)
  async deleteInternal(@Request() req: AuthRequest, @Param('id') id: string) {
    await this.service.deleteInternal(id, req.user.userId);
    return { success: true };
  }

  @Post(':scope/:id/save-to-workspace')
  @UseGuards(JwtAuthGuard)
  async saveToWorkspace(
    @Request() req: AuthRequest,
    @Param('scope') scopeRaw: string,
    @Param('id') id: string,
    @Body('workspaceId') workspaceId?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    const scope = parseScope(scopeRaw);
    const userId = req.user.userId;

    const { buffer, contentType, fileName, size } =
      await this.service.getTemplateBuffer(scope, id, userId);
    const fakeMulterFile = {
      originalname: fileName,
      mimetype: contentType,
      size,
      buffer,
    } as unknown as Express.Multer.File;

    return this.filesService.upload({
      file: fakeMulterFile,
      userId,
      workspaceId,
      category: 'template',
    });
  }
}
