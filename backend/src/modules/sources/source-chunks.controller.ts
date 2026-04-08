import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SourcesService } from './sources.service';

/**
 * Dedicated controller so `GET /sources/chunks/:id` never competes with `GET /sources/:id`.
 */
@UseGuards(JwtAuthGuard)
@Controller('sources/chunks')
export class SourceChunksController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get(':sourceId')
  async getChunks(
    @Request() req: { user: { userId: string } },
    @Param('sourceId') sourceId: string,
  ) {
    return this.sourcesService.findSourceChunksForReader(
      sourceId,
      req.user.userId,
    );
  }
}
