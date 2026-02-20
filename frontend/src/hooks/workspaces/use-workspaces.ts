import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Workspace } from '@/stores/workspace-store';

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces'),
  });
}

export function useWorkspace(id: string) {
  return useQuery<Workspace>({
    queryKey: ['workspaces', id],
    queryFn: () => api.get(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useWorkspaceStats(id: string) {
  return useQuery({
    queryKey: ['workspaces', id, 'stats'],
    queryFn: () => api.get<{ documents: number; files: number; sources: number }>(`/workspaces/${id}/stats`),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; plan?: string }) => api.post<Workspace>('/workspaces', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
