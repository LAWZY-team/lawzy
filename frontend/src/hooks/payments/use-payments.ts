import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  orderCode: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
  plan: { id: string; name: string; slug: string };
}

export interface PaymentsListResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePaymentResponse {
  orderId: string;
  orderCode: string;
  checkoutUrl: string;
  status: string;
  paymentId: string;
}

export function usePayments(page = 1, limit = 20) {
  return useQuery<PaymentsListResponse>({
    queryKey: ['payments', page, limit],
    queryFn: () => api.get<PaymentsListResponse>(`/payments?page=${page}&limit=${limit}`),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { planId: string; workspaceId?: string }) =>
      api.post<CreatePaymentResponse>('/payments', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payments'] }),
  });
}
