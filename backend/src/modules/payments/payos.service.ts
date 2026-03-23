/**
 * PayOS integration - mock implementation.
 * Replace with @payos/node when PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY are configured.
 */
export interface PayOSCreateInput {
  orderCode: string;
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

export class PayOSService {
  static async createPayment(
    input: PayOSCreateInput,
  ): Promise<PayOSCreateResult> {
    const { PAYOS_CLIENT_ID, PAYOS_API_KEY } = process.env;
    if (PAYOS_CLIENT_ID && PAYOS_API_KEY) {
      // TODO: Use @payos/node for real integration
      // const payos = new PayOS({ clientId, apiKey, checksumKey });
      // return payos.paymentRequests.create(...);
    }
    // Mock: return relative URL for frontend status page
    return {
      orderCode: input.orderCode,
      checkoutUrl: `/payment/status/${input.orderCode}`,
    };
  }

  static async getPaymentLink(orderCode: string): Promise<string | null> {
    // Mock: in real flow, PayOS would provide checkout URL
    return `/payment/status/${orderCode}`;
  }
}
