import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DocumentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  creator?: { name: string; avatar?: string };
}

interface PaginatedDocs {
  data: DocumentItem[];
  total: number;
  page: number;
  limit: number;
}

export function useDocuments(workspaceId: string, opts?: { status?: string; type?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams({ workspaceId });
  if (opts?.status) params.set('status', opts.status);
  if (opts?.type) params.set('type', opts.type);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));

  return useQuery<PaginatedDocs>({
    queryKey: ['documents', workspaceId, opts],
    queryFn: () => api.get(`/documents?${params.toString()}`),
    enabled: !!workspaceId,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.get<Record<string, unknown>>(`/documents/${id}`),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; type?: string; workspaceId: string; templateId?: string; contentJSON?: unknown }) =>
      api.post('/documents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; status?: string; contentJSON?: unknown; metadata?: unknown; mergeFieldValues?: unknown }) =>
      api.patch(`/documents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
