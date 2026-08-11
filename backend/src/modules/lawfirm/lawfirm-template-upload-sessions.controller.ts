import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTemplateUploadSessionDto } from './dto/template-upload-session.dto';
import { LAWFIRM_MAX_UPLOAD_BYTES } from './lawfirm.constants';
import { LawfirmTemplateUploadSessionsService } from './lawfirm-template-upload-sessions.service';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm/template-upload-sessions')
export class LawfirmTemplateUploadSessionsController {
  constructor(
    private readonly uploadSessions: LawfirmTemplateUploadSessionsService,
  ) {}

  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateTemplateUploadSessionDto,
  ) {
    return this.uploadSessions.create(req.user.userId, body);
  }

  @Post(':sessionId/documents')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: LAWFIRM_MAX_UPLOAD_BYTES, files: 20 },
    }),
  )
  addDocuments(
    @Request() req: { user: { userId: string } },
    @Param('sessionId') sessionId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadSessions.addDocuments(
      req.user.userId,
      sessionId,
      files ?? [],
    );
  }

  @Post(':sessionId/finalize')
  finalize(
    @Request() req: { user: { userId: string } },
    @Param('sessionId') sessionId: string,
  ) {
    return this.uploadSessions.finalize(req.user.userId, sessionId);
  }

  @Get(':sessionId')
  getStatus(
    @Request() req: { user: { userId: string } },
    @Param('sessionId') sessionId: string,
  ) {
    return this.uploadSessions.getStatus(req.user.userId, sessionId);
  }
}
