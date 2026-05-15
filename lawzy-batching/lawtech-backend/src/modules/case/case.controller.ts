import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { CaseService } from './case.service';

@Controller('cases')
export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  @Post()
  async createCase(@Body() data: { name: string; createdBy: string }) {
    return this.caseService.createCase(data);
  }

  @Get(':id')
  async getCase(@Param('id') id: string) {
    return this.caseService.getCase(id);
  }

  @Get()
  async listCases() {
    return this.caseService.listCases();
  }
}
