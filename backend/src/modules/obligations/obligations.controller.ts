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
import { ObligationsService } from './obligations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Get('documents/:documentId/obligations')
  async getByDocument(
    @Request() req: any,
    @Param('documentId') documentId: string,
  ) {
    const userId = req.user.userId;
    return this.obligationsService.findByDocument(userId, documentId);
  }

  @Post('documents/:documentId/obligations')
  async create(
    @Request() req: any,
    @Param('documentId') documentId: string,
    @Body()
    body: {
      title: string;
      description?: string;
      status?: string;
      dueDate: string;
      amount?: number;
      percentage?: number;
      triggerCondition?: string;
      obligationType?: string;
      effectivePeriod?: string;
      responsibleVendor?: string;
      picId?: string;
    },
  ) {
    const userId = req.user.userId;
    if (!body.title) {
      throw new BadRequestException('title is required');
    }
    if (!body.dueDate) {
      throw new BadRequestException('dueDate is required');
    }
    return this.obligationsService.create(userId, documentId, body);
  }

  @Get('obligations')
  async getByWorkspace(
    @Request() req: any,
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user.userId;
    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    return this.obligationsService.findByWorkspace(userId, workspaceId, status);
  }

  @Patch('obligations/:id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: string;
      amount?: number;
      percentage?: number;
      triggerCondition?: string;
      obligationType?: string;
      effectivePeriod?: string;
      responsibleVendor?: string;
      picId?: string;
    },
  ) {
    const userId = req.user.userId;
    return this.obligationsService.update(userId, id, body);
  }

  @Delete('obligations/:id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.obligationsService.delete(userId, id);
  }
}
