import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  createdAt: string;
  userId?: string;
  user?: { id: string; name: string; avatar?: string };
}

interface PaginatedFiles {
  data: FileItem[];
  total: number;
  page: number;
  limit: number;
}

export function useFiles(
  workspaceId: string,
  opts?: {
    page?: number;
    limit?: number;
    filterByUserId?: string;
    documentId?: string;
    category?: 'input_upload' | 'template' | 'export_output';
  }
) {
  const params = new URLSearchParams({ workspaceId });
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.filterByUserId) params.set('filterByUserId', opts.filterByUserId);
  if (opts?.documentId) params.set('documentId', opts.documentId);
  if (opts?.category) params.set('category', opts.category);

  return useQuery<PaginatedFiles>({
    queryKey: ['files', workspaceId, opts],
    queryFn: () => api.get(`/files?${params.toString()}`),
    enabled: !!workspaceId,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; workspaceId: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('workspaceId', data.workspaceId);
      return api.upload('/files/upload', formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  });
}

export function useStorageUsed(workspaceId: string) {
  return useQuery<{ bytes: number; limitBytes?: number }>({
    queryKey: ['files', 'storage', workspaceId],
    queryFn: () => api.get(`/files/storage/${workspaceId}`),
    enabled: !!workspaceId,
  });
}
