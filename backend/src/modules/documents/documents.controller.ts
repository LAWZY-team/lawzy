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
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async list(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    return this.documentsService.findByWorkspace(workspaceId, {
      status,
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      title: string;
      type?: string;
      workspaceId: string;
      templateId?: string;
      contentJSON?: any;
      metadata?: any;
      mergeFieldValues?: any;
      status?: string;
    },
  ) {
    const userId = req.user.userId;
    if (
      body.status !== undefined &&
      !['draft', 'completed', 'review', 'approved', 'signed', 'archived'].includes(
        body.status,
      )
    ) {
      throw new BadRequestException('Invalid status');
    }
    return this.documentsService.create({
      ...body,
      createdBy: userId,
    });
  }

  @Get('recent')
  async getRecent(@Request() req: any, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    return this.documentsService.getRecentByUser(
      userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('stats/overview')
  async getStatsOverview(@Request() req: any) {
    const userId = req.user.userId;
    return this.documentsService.getStatsOverview(userId);
  }

  @Get('stats/:workspaceId')
  async getStatsByWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.documentsService.getStatsByWorkspace(workspaceId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.documentsService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      status?: string;
      contentJSON?: any;
      metadata?: any;
      mergeFieldValues?: any;
    },
  ) {
    return this.documentsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.documentsService.delete(id);
  }

  @Post(':id/versions')
  async createVersion(
    @Request() req: any,
    @Param('id') documentId: string,
    @Body()
    body: {
      contentJSON: any;
      mergeFieldValues?: any;
      chatCursorAt?: string;
      label?: string;
    },
  ) {
    const userId = req.user.userId;
    return this.documentsService.createVersion(documentId, {
      ...body,
      createdBy: userId,
    });
  }

  @Get(':id/versions')
  async getVersions(@Param('id') documentId: string) {
    return this.documentsService.getVersions(documentId);
  }

  @Get(':id/versions/:versionId')
  async getVersion(
    @Param('id') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.documentsService.getVersion(documentId, versionId);
  }

  @Post(':id/chat-messages')
  async createChatMessage(
    @Request() req: any,
    @Param('id') documentId: string,
    @Body()
    body: { role: 'user' | 'assistant'; content: string; metadata?: any },
  ) {
    const userId = req.user.userId;
    return this.documentsService.createChatMessage(documentId, {
      ...body,
      userId,
    });
  }

  @Get(':id/chat-messages')
  async getChatMessages(
    @Request() req: any,
    @Param('id') documentId: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user.userId;
    return this.documentsService.getChatMessages(documentId, {
      userId,
      to,
    });
  }
}
