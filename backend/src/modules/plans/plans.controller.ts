import { Controller, Get, Param } from '@nestjs/common';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAllPublic();
  }

  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.plansService.findBySlug(slug);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }
}
