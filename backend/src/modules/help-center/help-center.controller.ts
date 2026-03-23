import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { HelpCenterService } from './help-center.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { Request } from 'express';

@Controller('help-center')
export class HelpCenterController {
  constructor(
    private readonly helpCenterService: HelpCenterService,
    private readonly usersService: UsersService,
  ) {}

  @Post('contact')
  async submitContact(
    @Body()
    body: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
      message: string;
    },
  ) {
    if (!body?.name || !body?.email) {
      throw new BadRequestException('Name and email are required');
    }
    return this.helpCenterService.submitContact({
      type: 'sales_inquiry',
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      phone: body.phone ? String(body.phone).trim() : undefined,
      company: body.company ? String(body.company).trim() : undefined,
      message: body.message ? String(body.message).trim() : '',
    });
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  async submitFeedback(
    @Req() req: Request,
    @Body() body: { type: string; title: string; description: string },
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!body) {
      throw new BadRequestException('Request body is missing or malformed');
    }
    const jwtUser = (req as { user?: { userId: string; email: string } }).user;
    if (!jwtUser) {
      throw new BadRequestException(
        'Authentication required for help submissions',
      );
    }

    const dbUser = await this.usersService.findById(jwtUser.userId);
    if (!dbUser) {
      throw new BadRequestException('User not found');
    }

    const attachments = files?.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    return this.helpCenterService.submitFeedback({
      userName: dbUser.name,
      userEmail: dbUser.email,
      userId: dbUser.id,
      type: body.type,
      title: body.title,
      description: body.description,
      attachments,
    });
  }

  @Get('inbox')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listInbox(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.helpCenterService.listSubmissions({
      type,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('inbox/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    if (!body?.status) {
      throw new BadRequestException('status is required');
    }
    return this.helpCenterService.updateStatus(id, body.status);
  }
}
