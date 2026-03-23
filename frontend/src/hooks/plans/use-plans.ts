import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Plan } from '@/types/plan';

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/plans'),
  });
}

export function usePlansAdmin() {
  return useQuery<Plan[]>({
    queryKey: ['plans', 'admin'],
    queryFn: () => api.get<Plan[]>('/admin/plans'),
  });
}

export function usePlanById(id: string | null) {
  return useQuery<Plan>({
    queryKey: ['plans', id],
    queryFn: () => api.get<Plan>(`/admin/plans/${id!}`),
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.post>[1]) => api.post<Plan>('/admin/plans', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.patch>[1]) =>
      api.patch<Plan>(`/admin/plans/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}
