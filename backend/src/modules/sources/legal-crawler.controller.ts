import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LegalCrawlerService } from './legal-crawler.service';

@Controller('admin/sources/crawl')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LegalCrawlerController {
  constructor(private readonly crawlerService: LegalCrawlerService) {}

  @Post()
  async startCrawl(
    @Request() req: any,
    @Body('pageFrom') pageFromRaw?: number,
    @Body('pageTo') pageToRaw?: number,
    @Body('fieldIds') fieldIds?: number[],
    @Body('docTypeIds') docTypeIds?: number[],
  ) {
    const pageFrom = Number(pageFromRaw) || 1;
    const pageTo = Number(pageToRaw) || 10;

    if (pageFrom < 1 || pageTo < pageFrom) {
      throw new BadRequestException('Invalid page range');
    }
    if (pageTo - pageFrom > 500) {
      throw new BadRequestException('Max 500 pages per crawl job');
    }

    const jobId = this.crawlerService.startCrawl({
      userId: req.user.userId,
      pageFrom,
      pageTo,
      fieldIds: Array.isArray(fieldIds) ? fieldIds : undefined,
      docTypeIds: Array.isArray(docTypeIds) ? docTypeIds : undefined,
    });

    return { jobId };
  }

  @Get(':jobId/status')
  async getStatus(@Param('jobId') jobId: string) {
    const job = this.crawlerService.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Crawl job not found');
    }
    return job;
  }
}
