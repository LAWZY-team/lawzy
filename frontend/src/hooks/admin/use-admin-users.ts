import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface AdminUserWorkspace {
  id: string
  name: string
  role: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  avatar?: string | null
  roles: string[]
  position?: string | null
  isVerified: boolean
  provider?: string | null
  createdAt: string
  updatedAt: string
  workspaces?: AdminUserWorkspace[]
}

interface PaginatedUsers {
  data: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function useAdminUsers(opts?: {
  page?: number
  limit?: number
  q?: string
  role?: string
  scope?: "all" | "workspace"
  workspaceId?: string
  /** Override to disable query (e.g. when tab doesn't need users) */
  enabled?: boolean
}) {
  const params = new URLSearchParams()
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.q) params.set("q", opts.q)
  if (opts?.role) params.set("role", opts.role)
  if (opts?.scope) params.set("scope", opts.scope)
  if (opts?.workspaceId) params.set("workspaceId", opts.workspaceId)

  const scopeEnabled =
    !opts?.scope ||
    opts.scope !== "workspace" ||
    !!opts?.workspaceId
  const enabled = opts?.enabled !== undefined ? opts.enabled : scopeEnabled

  return useQuery<PaginatedUsers>({
    queryKey: ["admin", "users", opts],
    queryFn: () => api.get(`/admin/users?${params.toString()}`),
    enabled,
  })
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })
}
