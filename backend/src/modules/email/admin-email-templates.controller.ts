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
import { AdminEmailTemplatesService } from './admin-email-templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export type EmailTemplateCreateDto = {
  code: string;
  name: string;
  description?: string;
  subject: string;
  bodyHtml: string;
  variables?: string[];
  isActive?: boolean;
};

export type EmailTemplateUpdateDto = Partial<
  Omit<EmailTemplateCreateDto, 'code'>
>;

@Controller('admin/email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminEmailTemplatesController {
  constructor(
    private readonly adminEmailTemplatesService: AdminEmailTemplatesService,
  ) {}

  @Get()
  list() {
    return this.adminEmailTemplatesService.list();
  }

  @Get('codes')
  listCodes() {
    return this.adminEmailTemplatesService.getAvailableCodes();
  }

  @Get('by-code/:code')
  getByCode(@Param('code') code: string) {
    return this.adminEmailTemplatesService.getByCode(code);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.adminEmailTemplatesService.getById(id);
  }

  @Post()
  create(@Body() body: EmailTemplateCreateDto) {
    return this.adminEmailTemplatesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: EmailTemplateUpdateDto) {
    return this.adminEmailTemplatesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.adminEmailTemplatesService.delete(id);
  }

  @Post(':id/test')
  sendTest(
    @Param('id') id: string,
    @Body() body: { toEmail: string; variables?: Record<string, string> },
  ) {
    return this.adminEmailTemplatesService.sendTest(id, body.toEmail, body.variables);
  }
}
