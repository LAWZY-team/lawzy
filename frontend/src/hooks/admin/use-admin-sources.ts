import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { WorkspaceSourceChunk } from '@/hooks/sources/use-sources'

export interface AdminSource {
  id: string
  title: string
  type: string
  status: string
  scope: string
  s3Key?: string
  sourceUrl?: string
  size: number
  /** Full extracted text when returned by admin list API */
  content?: string | null
  pageCount?: number
  chunkCount?: number
  processingError?: string
  tags?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string }
  workspace?: { id: string; name: string } | null
}

interface PaginatedAdminSources {
  data: AdminSource[]
  total: number
  page: number
  limit: number
}

export const useAdminSources = (opts?: { page?: number; limit?: number; scope?: string }) => {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.scope) params.set('scope', opts.scope)

  return useQuery<PaginatedAdminSources>({
    queryKey: ['admin-sources', opts],
    queryFn: () => api.get(`/admin/sources?${params.toString()}`),
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? []
      if (list.length === 0) return false
      const hasInFlight = list.some(
        (s) => s.status === 'pending' || s.status === 'processing',
      )
      return hasInFlight ? 2500 : false
    },
  })
}

export const useDeleteAdminSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sources'] })
      qc.invalidateQueries({ queryKey: ['admin-source-chunks'] })
    },
  })
}

export const useAdminSourceChunks = (sourceId: string | null, enabled: boolean) => {
  return useQuery<{ chunks: WorkspaceSourceChunk[] }>({
    queryKey: ['admin-source-chunks', sourceId],
    queryFn: () => api.get(`/admin/sources/chunks/${sourceId}`),
    enabled: enabled && !!sourceId,
  })
}

export const useReprocessAdminSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/admin/sources/${id}/reprocess`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sources'] })
      qc.invalidateQueries({ queryKey: ['admin-source-chunks'] })
    },
  })
}
