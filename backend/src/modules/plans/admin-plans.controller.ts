import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { PlanCreateInput, PlanUpdateInput } from './plans.service';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  list() {
    return this.plansService.findAllAdmin();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  @Post()
  create(@Body() body: PlanCreateInput) {
    return this.plansService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: PlanUpdateInput) {
    return this.plansService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.plansService.delete(id);
  }
}
