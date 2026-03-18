import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { HelpCenterService } from './help-center.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import type { Multer } from 'multer';

@Controller('help-center')
export class HelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5)) // Allow up to 5 images
  async submitFeedback(
    @Req() req: Request,
    @Body() body: { type: string; title: string; description: string },
    @UploadedFiles() files: any[],
  ) {
    if (!body) {
      throw new BadRequestException('Request body is missing or malformed');
    }
    const user = (req as any).user;
    
    const attachments = files?.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    return this.helpCenterService.submitFeedback({
      userName: user.name,
      userEmail: user.email,
      type: body.type,
      title: body.title,
      description: body.description,
      attachments,
    });
  }
}
