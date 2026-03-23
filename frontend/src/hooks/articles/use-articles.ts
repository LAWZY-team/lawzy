import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface Article {
  id: string
  type: string
  title: string
  slug: string
  excerpt?: string | null
  content?: unknown
  contentText?: string | null
  coverImage?: string | null
  status: string
  publishedAt?: string | null
  authorId?: string | null
  author?: { id: string; name: string; email?: string; avatar?: string | null } | null
  metadata?: unknown
  createdAt: string
  updatedAt: string
}

interface PaginatedArticles {
  data: Article[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useArticles(opts?: {
  type?: string
  status?: string
  page?: number
  limit?: number
  q?: string
}) {
  const params = new URLSearchParams()
  if (opts?.type) params.set("type", opts.type)
  if (opts?.status) params.set("status", opts.status)
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.q) params.set("q", opts.q)

  return useQuery<PaginatedArticles>({
    queryKey: ["articles", opts],
    queryFn: () => api.get(`/articles?${params.toString()}`),
  })
}

export function useAdminArticles(opts?: {
  type?: string
  status?: string
  page?: number
  limit?: number
  q?: string
}) {
  const params = new URLSearchParams()
  if (opts?.type) params.set("type", opts.type)
  if (opts?.status) params.set("status", opts.status)
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.q) params.set("q", opts.q)

  return useQuery<PaginatedArticles>({
    queryKey: ["admin", "articles", opts],
    queryFn: () => api.get(`/admin/articles?${params.toString()}`),
  })
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ["articles", id],
    queryFn: () => api.get<Article>(`/articles/${id}`),
    enabled: !!id,
  })
}

export function useArticleBySlug(slug: string) {
  return useQuery({
    queryKey: ["articles", "slug", slug],
    queryFn: () => api.get<Article>(`/articles/by-slug/${encodeURIComponent(slug)}`),
    enabled: !!slug,
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type?: string
      title: string
      slug?: string
      excerpt?: string
      content?: unknown
      contentText?: string
      coverImage?: string
      status?: string
      publishedAt?: string | null
      metadata?: unknown
    }) => api.post<Article>("/articles", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] })
      qc.invalidateQueries({ queryKey: ["admin", "articles"] })
    },
  })
}

export function useUpdateArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      type?: string
      title?: string
      slug?: string
      excerpt?: string
      content?: unknown
      contentText?: string
      coverImage?: string
      status?: string
      publishedAt?: string | null
      metadata?: unknown
    }) => api.patch<Article>(`/articles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] })
      qc.invalidateQueries({ queryKey: ["admin", "articles"] })
    },
  })
}

export function useDeleteArticle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/articles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["articles"] })
      qc.invalidateQueries({ queryKey: ["admin", "articles"] })
    },
  })
}
