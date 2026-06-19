import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Plan } from '@/types/plan';

function getTier(plan: Plan): string {
  if (plan.price === 0 && !plan.contactSales) return 'free';
  const base = plan.slug.replace(/-monthly$|-yearly$/, '');
  return base || plan.slug;
}

/** Hiển thị plans theo chu kỳ tháng/năm — một plan mỗi tier. Gói contact-sales (Enterprise) chỉ hiện khi chọn năm. */
export function filterPlansForDisplay(plans: Plan[], yearly: boolean): Plan[] {
  const cycle = yearly ? 'yearly' : 'monthly';
  const byCycle = plans.filter((p) => {
    if (!p.isActive) return false;
    if (p.contactSales) return yearly;
    return p.billingCycle === cycle;
  });
  const freePlans = plans.filter((p) => p.isActive && p.price === 0 && !p.contactSales);
  const tierToMinOrder = new Map<string, number>();
  for (const p of plans) {
    const tier = getTier(p);
    const cur = tierToMinOrder.get(tier);
    tierToMinOrder.set(tier, cur == null ? p.sortOrder : Math.min(cur, p.sortOrder));
  }
  const tierOrder = Array.from(tierToMinOrder.entries())
    .sort((a, b) => a[1] - b[1])
    .map((e) => e[0]);

  const result: Plan[] = [];
  for (const tier of tierOrder) {
    const candidates =
      tier === 'free'
        ? byCycle.filter((p) => getTier(p) === 'free').length
          ? byCycle.filter((p) => getTier(p) === 'free')
          : freePlans
        : byCycle.filter((p) => getTier(p) === tier);
    const picked = candidates.sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (picked && !result.some((r) => r.id === picked.id)) {
      result.push(picked);
    }
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

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

export interface PlanWorkspace {
  id: string;
  name: string;
  membersCount: number;
}

export function usePlanWorkspaces(planId: string | null) {
  return useQuery<PlanWorkspace[]>({
    queryKey: ['plans', planId, 'workspaces'],
    queryFn: () => api.get<PlanWorkspace[]>(`/admin/plans/${planId!}/workspaces`),
    enabled: !!planId,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.post>[1]) =>
      api.post<Plan>('/admin/plans', data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['plans'] }),
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
