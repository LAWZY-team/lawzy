import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('initial')
  async getInitial(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limitStr?: string,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    const userId = req.user.userId;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const p = period === 'month' || period === 'year' ? period : 'week';
    const wsId = workspaceId || null;
    const [overview, recentDocuments, chart, workspaceBreakdown] = await Promise.all([
      this.dashboardService.getOverview(userId, wsId),
      this.dashboardService.getRecentDocuments(userId, limit, wsId),
      this.dashboardService.getChartData(userId, p, wsId),
      this.dashboardService.getWorkspaceBreakdown(userId),
    ]);
    return { overview, recentDocuments, chart, workspaceBreakdown };
  }

  @Get('overview')
  async getOverview(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const userId = req.user.userId;
    return this.dashboardService.getOverview(userId, workspaceId || null);
  }

  @Get('quota')
  async getQuota(
    @Request() req: any,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const userId = req.user.userId;
    return this.dashboardService.getQuotaOverview(userId, workspaceId || null);
  }

  @Get('chart')
  async getChart(
    @Request() req: any,
    @Query('period') period?: 'week' | 'month' | 'year',
    @Query('workspaceId') workspaceId?: string,
  ) {
    const userId = req.user.userId;
    const p = period === 'month' || period === 'year' ? period : 'week';
    return this.dashboardService.getChartData(userId, p, workspaceId || null);
  }

  @Get('recent')
  async getRecent(
    @Request() req: any,
    @Query('limit') limitStr?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const userId = req.user.userId;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.dashboardService.getRecentDocuments(userId, limit, workspaceId || null);
  }

  @Get('workspace-breakdown')
  async getWorkspaceBreakdown(@Request() req: any) {
    const userId = req.user.userId;
    return this.dashboardService.getWorkspaceBreakdown(userId);
  }
}
