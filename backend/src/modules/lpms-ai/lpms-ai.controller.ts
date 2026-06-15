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
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LpmsAiService, ColumnConfig } from './lpms-ai.service';

@UseGuards(JwtAuthGuard)
@Controller('lpms')
export class LpmsAiController {
  constructor(private readonly lpmsAiService: LpmsAiService) {}

  // Workflows
  @Get('workflows')
  async listWorkflows(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Query('type') type?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.listWorkflows(userId, workspaceId, type);
  }

  @Post('workflows')
  async createWorkflow(
    @Request() req: any,
    @Body()
    body: {
      workspaceId: string;
      title: string;
      type: string;
      promptMd?: string;
      columnsConfig?: any;
      practice?: string;
    },
  ) {
    if (!body.workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.createWorkflow(userId, body.workspaceId, body);
  }

  @Get('workflows/hidden')
  async listHiddenWorkflows(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.listHiddenWorkflows(userId, workspaceId);
  }

  @Post('workflows/hidden')
  async hideWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { workflowId: string },
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.hideWorkflow(userId, workspaceId, body.workflowId);
  }

  @Delete('workflows/hidden/:workflowId')
  async unhideWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.unhideWorkflow(userId, workspaceId, workflowId);
  }

  @Get('workflows/:id')
  async getWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.getWorkflow(userId, workspaceId, id);
  }

  @Patch('workflows/:id')
  async updateWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.updateWorkflow(userId, workspaceId, id, updates);
  }

  @Delete('workflows/:id')
  async deleteWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.deleteWorkflow(userId, workspaceId, id);
  }

  @Get('workflows/:id/shares')
  async listWorkflowShares(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.listWorkflowShares(userId, workspaceId, id);
  }

  @Post('workflows/:id/shares')
  async shareWorkflow(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { emails: string[]; allowEdit?: boolean },
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.shareWorkflow(
      userId,
      workspaceId,
      id,
      body.emails ?? [],
      body.allowEdit ?? false,
    );
  }

  @Delete('workflows/:id/shares/:shareId')
  async deleteWorkflowShare(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.deleteWorkflowShare(userId, workspaceId, id, shareId);
  }

  // Tabular Reviews
  @Get('tabular-review')
  async listReviews(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.listReviews(userId, workspaceId, projectId);
  }

  @Post('tabular-review')
  async createReview(
    @Request() req: any,
    @Body()
    body: {
      workspaceId: string;
      title?: string;
      documentIds: string[];
      columnsConfig: ColumnConfig[];
      workflowId?: string;
      projectId?: string;
    },
  ) {
    if (!body.workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.createReview(userId, body.workspaceId, body);
  }

  @Post('tabular-review/prompt')
  async generatePrompt(
    @Request() req: any,
    @Body()
    body: {
      workspaceId: string;
      title: string;
      format: string;
      tags?: string[];
    },
  ) {
    if (!body.workspaceId) throw new BadRequestException('workspaceId is required');
    if (!body.title) throw new BadRequestException('title is required');
    if (!body.format) throw new BadRequestException('format is required');
    const userId = req.user.userId;
    return this.lpmsAiService.generatePrompt(userId, body.workspaceId, body.title, body.format, body.tags);
  }

  @Get('tabular-review/:id')
  async getReview(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.getReview(userId, workspaceId, id);
  }

  @Get('tabular-review/:id/people')
  async getReviewPeople(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.getReviewPeople(userId, workspaceId, id);
  }

  @Patch('tabular-review/:id')
  async updateReview(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.updateReview(userId, workspaceId, id, updates);
  }

  @Delete('tabular-review/:id')
  async deleteReview(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.deleteReview(userId, workspaceId, id);
  }

  @Post('tabular-review/:id/clear-cells')
  async clearCells(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { documentIds: string[] },
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    if (!body.documentIds) throw new BadRequestException('documentIds is required');
    const userId = req.user.userId;
    return this.lpmsAiService.clearCells(userId, workspaceId, id, body.documentIds);
  }

  @Post('tabular-review/:id/regenerate-cell')
  async regenerateCell(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { documentId: string; columnIndex: number },
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    if (!body.documentId) throw new BadRequestException('documentId is required');
    if (body.columnIndex === undefined) throw new BadRequestException('columnIndex is required');
    const userId = req.user.userId;
    return this.lpmsAiService.regenerateCell(userId, workspaceId, id, body.documentId, body.columnIndex);
  }

  // SSE generation stream
  @Post('tabular-review/:id/generate')
  async generateReview(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.generateReview(userId, workspaceId, id, res);
  }

  // Chats
  @Get('tabular-review/:id/chats')
  async listChats(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.listChats(userId, workspaceId, id);
  }

  @Get('tabular-review/:id/chats/:chatId/messages')
  async getChatMessages(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('chatId') chatId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.getChatMessages(userId, workspaceId, id, chatId);
  }

  @Delete('tabular-review/:id/chats/:chatId')
  async deleteChat(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('chatId') chatId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.deleteChat(userId, workspaceId, chatId);
  }

  @Post('tabular-review/:id/chat')
  async chatWithTable(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { messages: any[]; chatId?: string; reviewTitle?: string },
    @Res() res: Response,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.chatWithTable(userId, workspaceId, id, body, res);
  }

  // Standalone Assistant Chats
  @Get('chats')
  async listStandaloneChats(@Request() req: any, @Query('limit') limit?: number) {
    const userId = req.user.userId;
    return this.lpmsAiService.listStandaloneChats(userId, limit);
  }

  @Post('chats/create')
  async createStandaloneChat(@Request() req: any, @Body() body: { project_id?: string }) {
    const userId = req.user.userId;
    return this.lpmsAiService.createStandaloneChat(userId, body.project_id);
  }

  @Get('chats/:id')
  async getStandaloneChat(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.lpmsAiService.getStandaloneChat(userId, id);
  }

  @Patch('chats/:id')
  async renameStandaloneChat(@Request() req: any, @Param('id') id: string, @Body() body: { title: string }) {
    const userId = req.user.userId;
    return this.lpmsAiService.renameStandaloneChat(userId, id, body.title);
  }

  @Delete('chats/:id')
  async deleteStandaloneChat(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.lpmsAiService.deleteStandaloneChat(userId, id);
  }

  @Post('chat')
  async streamStandaloneChat(
    @Request() req: any,
    @Body() body: { messages: any[]; chat_id?: string; project_id?: string; model?: string },
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    return this.lpmsAiService.streamStandaloneChat(userId, body, res);
  }

  // Document loading support for Tabular Review / Chat
  @Get('documents/:id/docx')
  async serveDocx(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.serveDocumentFile(userId, workspaceId, id, res);
  }

  @Get('documents/:id/display')
  async serveDisplay(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.serveDocumentFile(userId, workspaceId, id, res);
  }

  @Get('documents/:id/versions')
  async getDocumentVersions(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const userId = req.user.userId;
    return this.lpmsAiService.getDocumentVersions(userId, workspaceId, id);
  }

  @Post('case-opinions')
  async getCaseOpinions(
    @Body() body: { clusterId: number },
  ) {
    // Return empty opinions array for US case law as stub if not configured
    return { opinions: [] };
  }
}
