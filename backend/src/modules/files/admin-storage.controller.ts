import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FilesService } from './files.service';

@Controller('admin/storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminStorageController {
  constructor(private readonly filesService: FilesService) {}

  @Get('overview')
  async getOverview(@Query('from') from?: string) {
    return this.filesService.getAdminStorageOverview({
      fromR2: from === 'r2',
    });
  }
}
