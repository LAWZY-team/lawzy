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

export function useDashboardChart(period: 'week' | 'month' | 'year') {
  return useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard', 'chart', period],
    queryFn: () => api.get(`/dashboard/chart?period=${period}`),
  });
}

export function useRecentDocuments(limit = 10) {
  return useQuery<RecentDocument[]>({
    queryKey: ['dashboard', 'recent', limit],
    queryFn: () => api.get(`/dashboard/recent?limit=${limit}`),
  });
}

export function useWorkspaceBreakdown() {
  return useQuery<WorkspaceBreakdown[]>({
    queryKey: ['dashboard', 'workspace-breakdown'],
    queryFn: () => api.get('/dashboard/workspace-breakdown'),
  });
}
