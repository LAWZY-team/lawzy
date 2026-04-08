import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SourcesService } from './sources.service';

/**
 * Dedicated controller for `GET /admin/sources/chunks/:id` (avoids clashes with `DELETE /admin/sources/:id`).
 */
@Controller('admin/sources/chunks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSourceChunksController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get(':sourceId')
  async getChunks(@Param('sourceId') sourceId: string) {
    return this.sourcesService.findSourceChunksForAdmin(sourceId);
  }
}
