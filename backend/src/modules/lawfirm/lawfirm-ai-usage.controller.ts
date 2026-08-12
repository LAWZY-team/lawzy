import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LawfirmAiUsageService } from './lawfirm-ai-usage.service';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm/ai-usage')
export class LawfirmAiUsageController {
  constructor(private readonly usageService: LawfirmAiUsageService) {}

  @Get()
  report(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
    @Query('days') rawDays?: string,
  ) {
    if (!workspaceId) throw new BadRequestException('workspaceId is required');
    const days = rawDays ? Number.parseInt(rawDays, 10) : 30;
    return this.usageService.report(req.user.userId, workspaceId, days);
  }
}
