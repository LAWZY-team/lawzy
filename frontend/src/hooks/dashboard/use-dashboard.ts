import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface DashboardOverview {
  totalDocuments: number;
  draftDocuments: number;
  reviewDocuments: number;
  completedDocuments: number;
  totalFiles: number;
  totalSources: number;
  storageUsed: number;
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
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get('/dashboard/overview'),
  });
}

interface ChartApiPoint {
  date: string;
  count: number;
}

export function useDashboardChart(period: 'week' | 'month' | 'year') {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard', 'chart', period],
    queryFn: async () => {
      const raw = await api.get<ChartApiPoint[]>(`/dashboard/chart?period=${period}`);
      return (raw ?? []).map((r) => ({ name: r.date, total: r.count }));
    },
  });
}

export function useRecentDocuments(limit = 10) {
  return useQuery<RecentDocument[]>({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: () => api.get(`/dashboard/recent?limit=${limit}`),
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
