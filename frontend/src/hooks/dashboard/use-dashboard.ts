import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useWorkspaceStore } from '@/stores/workspace-store';

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

interface DashboardOverview {
  totalDocuments: number;
  draftDocuments: number;
  reviewDocuments: number;
  completedDocuments: number;
  totalFiles: number;
  totalSources: number;
  storageUsed: number;
  aiCreditsUsed?: number;
  aiCreditsLimit?: number;
  aiCreditsRemaining?: number;
  nextRenewalAt?: string | null;
  aiCreditsRenewalDays?: number;
}

interface ChartDataPoint {
  name: string;
  total: number;
}

interface RecentDocument {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
  workspace?: { name: string };
  creator?: { name: string; avatar?: string };
}

interface WorkspaceBreakdown {
  name: string;
  value: number;
}

export function useDashboardOverview() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview', workspaceId ?? null],
    queryFn: () =>
      api.get(`/dashboard/overview${buildQueryString({ workspaceId: workspaceId ?? undefined })}`),
  });
}

interface ChartApiPoint {
  date: string;
  count: number;
}

export function useDashboardChart(period: 'week' | 'month' | 'year') {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard', 'chart', period, workspaceId ?? null],
    queryFn: async () => {
      const qs = buildQueryString({ period, workspaceId: workspaceId ?? undefined });
      const raw = await api.get<ChartApiPoint[]>(`/dashboard/chart${qs}`);
      return (raw ?? []).map((r) => ({ name: r.date, total: r.count }));
    },
  });
}

export function useRecentDocuments(limit = 10) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<RecentDocument[]>({
    queryKey: ['dashboard', 'recent', limit, workspaceId ?? null],
    queryFn: () =>
      api.get(`/dashboard/recent${buildQueryString({ limit, workspaceId: workspaceId ?? undefined })}`),
  });
}

interface WorkspaceBreakdownApi {
  workspaceId: string;
  workspaceName: string;
  documentCount: number;
}

export function useWorkspaceBreakdown() {
  return useQuery<WorkspaceBreakdown[]>({
    queryKey: ['dashboard', 'workspace-breakdown'],
    queryFn: async () => {
      const raw = await api.get<WorkspaceBreakdownApi[]>('/dashboard/workspace-breakdown');
      return (raw ?? []).map((r) => ({ name: r.workspaceName, value: r.documentCount }));
    },
  });
}
