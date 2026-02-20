import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface SourceItem {
  id: string;
  title: string;
  type: string;
  status: string;
  s3Key?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  user?: { name: string; avatar?: string };
}

interface PaginatedSources {
  data: SourceItem[];
  total: number;
  page: number;
  limit: number;
}

export function useSources(workspaceId: string, opts?: { page?: number; limit?: number }) {
  const params = new URLSearchParams({ workspaceId });
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));

  return useQuery<PaginatedSources>({
    queryKey: ['sources', workspaceId, opts],
    queryFn: () => api.get(`/sources?${params.toString()}`),
    enabled: !!workspaceId,
  });
}

export function useUploadSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; title: string; type: string; workspaceId: string; tags?: string[] }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('type', data.type);
      formData.append('workspaceId', data.workspaceId);
      if (data.tags) formData.append('tags', JSON.stringify(data.tags));
      return api.upload('/sources', formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}
