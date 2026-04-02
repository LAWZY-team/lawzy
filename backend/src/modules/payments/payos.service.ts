import { Injectable, Logger } from '@nestjs/common';
import { PayOS } from '@payos/node';
import type { Webhook } from '@payos/node';

export interface PayOSCreateInput {
  orderCode: number;
  amount: number;
  description: string;
  items: { name: string; quantity: number; price: number }[];
  returnUrl: string;
  cancelUrl: string;
}

export interface PayOSCreateResult {
  checkoutUrl: string;
  orderCode: string;
}

function createPayOSClient(): PayOS | null {
  const clientId = process.env.PAYOS_CLIENT_ID?.trim();
  const apiKey = process.env.PAYOS_API_KEY?.trim();
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY?.trim();
  if (!clientId || !apiKey || !checksumKey) {
    return null;
  }
  const baseURL =
    process.env.PAYOS_BASE_URL?.trim() || 'https://api-merchant.payos.vn';
  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
    baseURL,
  });
}

function safeDescription(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= 25) return t;
  return t.slice(0, 25);
}

@Injectable()
export class PayOSService {
  private readonly logger = new Logger(PayOSService.name);

  private getClient(): PayOS | null {
    return createPayOSClient();
  }

  async createPayment(input: PayOSCreateInput): Promise<PayOSCreateResult> {
    const client = this.getClient();
    const orderCodeStr = String(input.orderCode);

    if (!client) {
      this.logger.warn(
        'PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY missing — using mock checkout URL',
      );
      return {
        orderCode: orderCodeStr,
        checkoutUrl: `/payment/status/${orderCodeStr}`,
      };
    }

    try {
      const data = await client.paymentRequests.create({
        orderCode: input.orderCode,
        amount: input.amount,
        description: safeDescription(input.description),
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        items: input.items?.length
          ? input.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
            }))
          : undefined,
      });

      return {
        orderCode: orderCodeStr,
        checkoutUrl: data.checkoutUrl,
      };
    } catch (err) {
      this.logger.error(
        `payOS create payment failed: ${err instanceof Error ? err.message : err}`,
      );
      throw err;
    }
  }

  async getPaymentLink(orderCode: string): Promise<string | null> {
    const client = this.getClient();
    if (!client) {
      return `/payment/status/${orderCode}`;
    }
    const num = Number(orderCode);
    if (!Number.isFinite(num)) return null;
    try {
      const link = await client.paymentRequests.get(num);
      const id = link.id;
      if (id && link.status === 'PENDING') {
        return `https://pay.payos.vn/web/${id}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  async verifyWebhookPayload(body: Webhook): Promise<Webhook['data']> {
    const client = this.getClient();
    if (!client) {
      throw new Error('payOS is not configured (missing credentials)');
    }
    return client.webhooks.verify(body);
  }

  isConfigured(): boolean {
    return this.getClient() !== null;
  }
}
