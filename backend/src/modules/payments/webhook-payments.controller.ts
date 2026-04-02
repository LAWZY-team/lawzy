import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayOSService } from './payos.service';
import type { Webhook } from '@payos/node';

function isPayOSWebhookBody(body: unknown): body is Webhook {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.signature === 'string' &&
    b.data !== null &&
    typeof b.data === 'object'
  );
}

@Controller('payments/webhook')
export class WebhookPaymentsController {
  private readonly logger = new Logger(WebhookPaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payosService: PayOSService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: unknown) {
    if (!isPayOSWebhookBody(body)) {
      throw new BadRequestException('Invalid webhook payload');
    }
    if (!this.payosService.isConfigured()) {
      this.logger.warn('payOS webhook ignored: PAYOS_* not configured');
      throw new ServiceUnavailableException('payOS not configured');
    }
    try {
      await this.paymentsService.handlePayOSWebhook(body);
      return { success: true };
    } catch (err) {
      this.logger.warn(
        `payOS webhook failed: ${err instanceof Error ? err.message : err}`,
      );
      throw new UnauthorizedException('Invalid or unverifiable webhook');
    }
  }
}
