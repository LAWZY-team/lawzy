import { Controller, Get, Patch, Put, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    const user = await this.usersService.findById((req as any).user.userId);
    if (!user) return { error: 'User not found' };
    return this.usersService.sanitize(user);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: Request,
    @Body() body: { name?: string; avatar?: string },
  ) {
    const updated = await this.usersService.updateProfile(
      (req as any).user.userId,
      body,
    );
    return this.usersService.sanitize(updated);
  }

  @Get('me/custom-fields')
  @UseGuards(JwtAuthGuard)
  async getCustomFields(@Req() req: Request) {
    return this.usersService.getCustomFields((req as any).user.userId);
  }

  @Put('me/custom-fields')
  @UseGuards(JwtAuthGuard)
  async replaceCustomFields(
    @Req() req: Request,
    @Body()
    body: {
      fields: Array<{
        key: string;
        label: string;
        defaultValue?: string | null;
        isHidden?: boolean;
      }>;
    },
  ) {
    if (!body || !Array.isArray(body.fields)) {
      throw new BadRequestException('fields must be an array');
    }
    return this.usersService.replaceCustomFields(
      (req as any).user.userId,
      body.fields,
    );
  }
}
