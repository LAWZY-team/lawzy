import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(@Request() req: any) {
    const userId = req.user.userId;
    return this.dashboardService.getOverview(userId);
  }

  @Get('chart')
  async getChart(
    @Request() req: any,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    const userId = req.user.userId;
    const p = period === 'month' || period === 'year' ? period : 'week';
    return this.dashboardService.getChartData(userId, p);
  }

  @Get('recent')
  async getRecent(
    @Request() req: any,
    @Query('limit') limitStr?: string,
  ) {
    const userId = req.user.userId;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.dashboardService.getRecentDocuments(userId, limit);
  }

  @Get('workspace-breakdown')
  async getWorkspaceBreakdown(@Request() req: any) {
    const userId = req.user.userId;
    return this.dashboardService.getWorkspaceBreakdown(userId);
  }
}
