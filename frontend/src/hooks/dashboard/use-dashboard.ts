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

export interface DashboardOverview {
  totalDocuments: number;
  draftDocuments: number;
  reviewDocuments: number;
  completedDocuments: number;
  totalFiles: number;
}

export interface DashboardQuota {
  totalFiles: number;
  totalSources: number;
  storageUsed: number;
  storageBreakdown?: {
    input_upload: { bytes: number; count: number };
    input_source: { bytes: number; count: number };
    template: { bytes: number; count: number };
    export_output: { bytes: number; count: number };
  };
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
    staleTime: 15_000,
  });
}

export function useDashboardQuota() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<DashboardQuota>({
    queryKey: ['dashboard', 'quota', workspaceId ?? null],
    queryFn: () =>
      api.get(`/dashboard/quota${buildQueryString({ workspaceId: workspaceId ?? undefined })}`),
    staleTime: 15_000,
  });
}

interface ChartApiPoint {
  date: string;
  count: number;
}

export function useDashboardChart(
  period: 'week' | 'month' | 'year',
  options?: { enabled?: boolean }
) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const enabled = options?.enabled ?? true;
  return useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard', 'chart', period, workspaceId ?? null],
    queryFn: async () => {
      const qs = buildQueryString({ period, workspaceId: workspaceId ?? undefined });
      const raw = await api.get<ChartApiPoint[]>(`/dashboard/chart${qs}`);
      return (raw ?? []).map((r) => ({ name: r.date, total: r.count }));
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useRecentDocuments(limit = 10) {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<RecentDocument[]>({
    queryKey: ['dashboard', 'recent', limit, workspaceId ?? null],
    queryFn: () =>
      api.get(`/dashboard/recent${buildQueryString({ limit, workspaceId: workspaceId ?? undefined })}`),
    staleTime: 15_000,
  });
}

interface WorkspaceBreakdownApi {
  workspaceId: string;
  workspaceName: string;
  documentCount: number;
}

interface DashboardInitialApiResponse {
  overview: DashboardOverview;
  recentDocuments: RecentDocument[];
  chart?: ChartApiPoint[];
  workspaceBreakdown?: WorkspaceBreakdownApi[];
}

export interface DashboardInitialResponse {
  overview: DashboardOverview;
  recentDocuments: RecentDocument[];
  chart: ChartDataPoint[];
  workspaceBreakdown: WorkspaceBreakdown[];
}

export function useDashboardInitial(limit = 10, period: 'week' | 'month' | 'year' = 'year') {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  return useQuery<DashboardInitialResponse>({
    queryKey: ['dashboard', 'initial', workspaceId ?? null, limit, period],
    queryFn: async () => {
      const raw = await api.get<DashboardInitialApiResponse>(
        `/dashboard/initial${buildQueryString({
          workspaceId: workspaceId ?? undefined,
          limit,
          period,
        })}`
      );
      return {
        overview: raw.overview,
        recentDocuments: raw.recentDocuments ?? [],
        chart: (raw.chart ?? []).map((r) => ({ name: r.date, total: r.count })),
        workspaceBreakdown: (raw.workspaceBreakdown ?? []).map((r) => ({
          name: r.workspaceName,
          value: r.documentCount,
        })),
      };
    },
    staleTime: 15_000,
  });
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
