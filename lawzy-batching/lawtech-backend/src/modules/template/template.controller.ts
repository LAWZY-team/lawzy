import { Controller, Post, UseInterceptors, UploadedFile, Body, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplate(
    @UploadedFile() file: any,
    @Body() metadata: { code: string; name: string; language: string; isRequired: string },
  ) {
    return this.templateService.uploadTemplate(file, {
      ...metadata,
      isRequired: metadata.isRequired === 'true',
    });
  }

  @Get()
  async listTemplates() {
    return this.templateService.listTemplates();
  }
}
