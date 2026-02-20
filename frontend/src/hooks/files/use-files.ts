import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  createdAt: string;
  user?: { name: string; avatar?: string };
}

interface PaginatedFiles {
  data: FileItem[];
  total: number;
  page: number;
  limit: number;
}

export function useFiles(workspaceId: string, opts?: { page?: number; limit?: number }) {
  const params = new URLSearchParams({ workspaceId });
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.limit) params.set('limit', String(opts.limit));

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
  return useQuery<{ bytes: number }>({
    queryKey: ['files', 'storage', workspaceId],
    queryFn: () => api.get(`/files/storage/${workspaceId}`),
    enabled: !!workspaceId,
  });
}
