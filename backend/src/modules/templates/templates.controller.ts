import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Header,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Query('scope') scope?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAll({ scope, category });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      category?: string;
      scope?: string;
      contentJSON?: unknown;
      mergeFields?: unknown;
      metadata?: unknown;
    },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      category?: string;
      contentJSON?: unknown;
      mergeFields?: unknown;
      metadata?: unknown;
    },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }

  @Post('import-from-s3')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async importFromS3(
    @Body()
    body?: {
      key?: string;
      scope?: string;
    },
  ) {
    const result = await this.service.importFromS3Json({
      key: body?.key,
      scope: body?.scope,
    });
    return result;
  }
}
