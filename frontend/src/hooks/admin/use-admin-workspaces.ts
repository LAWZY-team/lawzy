import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface AdminWorkspace {
  id: string
  name: string
  plan: string
  createdAt: string
  _count: { members: number }
}

export interface WorkspaceWithMembers extends AdminWorkspace {
  members: Array<{
    id: string
    role: string
    joinedAt: string
    user: {
      id: string
      name: string
      email: string
      avatar: string | null
    }
  }>
}

export interface PaginatedWorkspaces {
  data: AdminWorkspace[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type AdminWorkspacesQueryOptions = {
  limit?: number
  q?: string
  plan?: string
  enabled?: boolean
}

const queryKey = ["admin", "workspaces"]

const buildWorkspacesParams = (opts?: {
  page?: number
  limit?: number
  q?: string
  plan?: string
}) => {
  const params = new URLSearchParams()
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.q) params.set("q", opts.q)
  if (opts?.plan) params.set("plan", opts.plan)
  return params
}

export function useAdminWorkspacesInfinite(opts?: AdminWorkspacesQueryOptions) {
  const limit = opts?.limit ?? 20
  const enabled = opts?.enabled !== undefined ? opts.enabled : true

  return useInfiniteQuery<PaginatedWorkspaces>({
    queryKey: [...queryKey, "infinite", opts],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const params = buildWorkspacesParams({
        page: Number(pageParam),
        limit,
        q: opts?.q,
        plan: opts?.plan,
      })
      return api.get(`/admin/workspaces?${params.toString()}`)
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page >= lastPage.totalPages) return undefined
      return lastPage.page + 1
    },
    enabled,
  })
}

export function useAdminWorkspaces(opts?: { q?: string; plan?: string }) {
  const params = buildWorkspacesParams({ page: 1, limit: 100, q: opts?.q, plan: opts?.plan })
  return useQuery<PaginatedWorkspaces>({
    queryKey: [...queryKey, opts],
    queryFn: () => api.get(`/admin/workspaces?${params.toString()}`),
  })
}

export function useAdminWorkspace(id: string | null) {
  return useQuery<WorkspaceWithMembers>({
    queryKey: [...queryKey, id],
    queryFn: () => api.get(`/admin/workspaces/${id}`),
    enabled: !!id,
  })
}

export function useCreateAdminWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; plan?: string }) =>
      api.post("/admin/workspaces", body),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })
}

export function useUpdateAdminWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; plan?: string }) =>
      api.patch(`/admin/workspaces/${id}`, body),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: [...queryKey, id] })
      if (variables.plan !== undefined) {
        qc.invalidateQueries({ queryKey: ["plans"] })
      }
    },
  })
}

export function useDeleteAdminWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/workspaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  })
}

export function useAddWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; role?: string }) =>
      api.post(`/admin/workspaces/${workspaceId}/members`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: [...queryKey, workspaceId] })
    },
  })
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: [...queryKey, workspaceId] })
    },
  })
}
