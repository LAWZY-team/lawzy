import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Request() req: { user: { userId: string } },
    @Body() body: { planId: string; workspaceId: string },
  ) {
    const { planId, workspaceId } = body;
    if (!planId) {
      throw new BadRequestException('planId required');
    }
    return this.paymentsService.create(req.user.userId, workspaceId, planId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Request() req: { user: { userId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listForUser(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('by-order/:orderCode')
  getByOrderCode(@Param('orderCode') orderCode: string) {
    return this.paymentsService.getByOrderCode(orderCode);
  }
}
