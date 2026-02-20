import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
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
}
