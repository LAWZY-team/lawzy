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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LawfirmTemplateSetsService } from './lawfirm-template-sets.service';
import {
  CreateTemplateSetDto,
  ReorderTemplateDocumentsDto,
  ScanTemplateDocumentDto,
  UpdateTemplateDocumentDto,
  UpdateTemplateSetDto,
} from './dto/template-set.dto';
import { LAWFIRM_MAX_UPLOAD_BYTES } from './lawfirm.constants';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm/template-sets')
export class LawfirmTemplateSetsController {
  constructor(
    private readonly templateSetsService: LawfirmTemplateSetsService,
  ) {}

  @Get()
  async list(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.templateSetsService.list(req.user.userId, workspaceId);
  }

  @Post()
  async create(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateTemplateSetDto,
  ) {
    return this.templateSetsService.create(req.user.userId, body);
  }

  @Get(':id')
  async getOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.templateSetsService.getById(req.user.userId, id);
  }

  @Patch(':id')
  async update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: UpdateTemplateSetDto,
  ) {
    return this.templateSetsService.update(req.user.userId, id, body);
  }

  @Patch(':id/document-order')
  async reorderDocuments(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: ReorderTemplateDocumentsDto,
  ) {
    return this.templateSetsService.reorderDocuments(req.user.userId, id, body);
  }

  @Delete(':id')
  async delete(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.templateSetsService.delete(req.user.userId, id);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: LAWFIRM_MAX_UPLOAD_BYTES },
    }),
  )
  async uploadDocument(
    @Request() req: { user: { userId: string } },
    @Param('id') templateSetId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templateSetsService.uploadDocument(
      req.user.userId,
      templateSetId,
      file,
    );
  }

  @Patch('documents/:docId')
  async updateDocument(
    @Request() req: { user: { userId: string } },
    @Param('docId') docId: string,
    @Body() body: UpdateTemplateDocumentDto,
  ) {
    return this.templateSetsService.updateDocument(
      req.user.userId,
      docId,
      body,
    );
  }

  @Delete('documents/:docId')
  async deleteDocument(
    @Request() req: { user: { userId: string } },
    @Param('docId') docId: string,
  ) {
    return this.templateSetsService.deleteDocument(req.user.userId, docId);
  }

  @Post('template-documents/:id/scan')
  async scanDocument(
    @Request() req: { user: { userId: string } },
    @Param('id') documentId: string,
    @Body() body: ScanTemplateDocumentDto,
  ) {
    return this.templateSetsService.scanDocument(req.user.userId, documentId, {
      useAi: body.useAi ?? true,
    });
  }
}
