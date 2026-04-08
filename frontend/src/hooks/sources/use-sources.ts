import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface SourceItem {
  id: string;
  title: string;
  type: string;
  status: string;
  scope?: string;
  s3Key?: string;
  sourceUrl?: string | null;
  size?: number;
  pageCount?: number | null;
  chunkCount?: number | null;
  tags?: unknown;
  createdAt: string;
  updatedAt: string;
  user?: { id?: string; name: string; avatar?: string | null };
}

/** Full source from GET /sources/:id (includes content for members). */
export interface WorkspaceSourceDetail extends SourceItem {
  content?: string | null;
  processingError?: string | null;
  workspaceId?: string | null;
}

export interface WorkspaceSourceChunk {
  id: string;
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
  tokenCount: number;
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
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? [];
      if (list.length === 0) return false;
      const hasInFlight = list.some(
        (s) => s.status === 'pending' || s.status === 'processing',
      );
      return hasInFlight ? 2500 : false;
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      qc.invalidateQueries({ queryKey: ['workspace-source-detail'] });
      qc.invalidateQueries({ queryKey: ['workspace-source-chunks'] });
    },
  });
}

export function useWorkspaceSourceDetail(sourceId: string | null, enabled: boolean) {
  return useQuery<WorkspaceSourceDetail>({
    queryKey: ['workspace-source-detail', sourceId],
    queryFn: () => api.get(`/sources/${sourceId}`),
    enabled: enabled && !!sourceId,
  });
}

export function useWorkspaceSourceChunks(sourceId: string | null, enabled: boolean) {
  return useQuery<{ chunks: WorkspaceSourceChunk[] }>({
    queryKey: ['workspace-source-chunks', sourceId],
    queryFn: () => api.get(`/sources/chunks/${sourceId}`),
    enabled: enabled && !!sourceId,
  });
}
