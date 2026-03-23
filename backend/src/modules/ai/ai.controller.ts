import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('deduct-credit')
  async deductCredit(@Request() req: { user: { userId: string } }) {
    const userId = req.user.userId;
    return this.aiService.deductCredit(userId);
  }
}
