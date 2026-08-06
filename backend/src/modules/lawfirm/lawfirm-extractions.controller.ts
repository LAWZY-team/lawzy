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
import { LawfirmExtractionsService } from './lawfirm-extractions.service';
import {
  ApproveExtractionDto,
  RejectExtractionDto,
} from './dto/extraction.dto';

@UseGuards(JwtAuthGuard)
@Controller('lawfirm')
export class LawfirmExtractionsController {
  constructor(private readonly extractionsService: LawfirmExtractionsService) {}

  @Get('extractions')
  async list(
    @Request() req: { user: { userId: string } },
    @Query('workspaceId') workspaceId: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.extractionsService.list(req.user.userId, workspaceId, profileId);
  }

  @Post('extractions/:id/approve')
  async approve(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: ApproveExtractionDto,
  ) {
    if (!body.approvedFields?.length) {
      throw new BadRequestException('approvedFields is required');
    }
    return this.extractionsService.approve(req.user.userId, id, body);
  }

  @Post('extractions/:id/reject')
  async reject(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: RejectExtractionDto,
  ) {
    return this.extractionsService.reject(req.user.userId, id, body);
  }
}
