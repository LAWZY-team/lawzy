import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LawfirmFillRunsService } from './lawfirm-fill-runs.service';
import { CreateFillRunDto } from './dto/fill-run.dto';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm')
export class LawfirmFillRunsController {
  constructor(private readonly fillRunsService: LawfirmFillRunsService) {}

  @Post('fill-runs')
  async create(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateFillRunDto,
  ) {
    return this.fillRunsService.create(req.user.userId, body);
  }

  @Get('fill-runs')
  async list(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    return this.fillRunsService.list(req.user.userId, workspaceId);
  }

  @Get('fill-runs/:id')
  async getOne(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.fillRunsService.getById(req.user.userId, id);
  }

  @Get('fill-runs/:id/download')
  async download(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.fillRunsService.download(req.user.userId, id);
  }
}
