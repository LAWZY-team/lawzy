export interface PaymentRequest {
  userId: string
  plan: string
  amount: number
  currency: string
}

export interface PaymentResponse {
  orderId: string
  checkoutUrl: string
  status: 'pending' | 'success' | 'failed'
}

export class PayOSService {
  static async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    void request // Mock implementation - request available for future use
    const orderId = `ord${Date.now()}`
    
    return {
      orderId,
      checkoutUrl: `/payment/status/${orderId}`,
      status: 'pending',
    }
  }

  static async checkStatus(orderId: string) {
    // Mock implementation - check from mock data or generate random status
    return {
      orderId,
      status: 'pending' as const,
      amount: 1200000,
      currency: 'VND',
      createdAt: new Date().toISOString(),
    }
  }

  static async simulateWebhook(orderId: string, status: 'success' | 'failed') {
    // This will be called by the mock status page to simulate payment completion
    return {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    }
  }
}
