import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/webhook')
export class WebhookPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async handleWebhook(
    @Body() body: { orderCode?: string; orderId?: string; status?: string },
  ) {
    const orderCode = body.orderCode ?? body.orderId;
    if (!orderCode) {
      return { success: false, error: 'Missing orderCode' };
    }
    const status =
      body.status === 'success' || body.status === 'paid'
        ? 'paid'
        : body.status === 'cancelled'
          ? 'cancelled'
          : 'failed';
    await this.paymentsService.syncAndFulfill(orderCode, status);
    return { success: true, orderCode, status };
  }
}
