import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Workspace } from '@/stores/workspace-store';

export interface WorkspaceWithMembers extends Workspace {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    joinedAt: string;
    user: { id: string; name: string; email: string; avatar?: string | null };
  }>;
}

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces'),
  });
}

export function useWorkspace(id: string | null) {
  return useQuery<WorkspaceWithMembers>({
    queryKey: ['workspaces', id],
    queryFn: () => api.get(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useWorkspaceStats(id: string) {
  return useQuery({
    queryKey: ['workspaces', id, 'stats'],
    queryFn: () => api.get<{ documentCount: number; fileCount: number; sourceCount: number }>(`/workspaces/${id}/stats`),
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

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string }) => api.patch(`/workspaces/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspaces', id] });
    },
  });
}

export function useAddWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role?: string }) =>
      api.post(`/workspaces/${workspaceId}/members`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId] });
    },
  });
}
