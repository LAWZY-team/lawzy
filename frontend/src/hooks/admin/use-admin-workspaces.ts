import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

const queryKey = ["admin", "workspaces"]

export function useAdminWorkspaces() {
  return useQuery<AdminWorkspace[]>({
    queryKey,
    queryFn: () => api.get("/admin/workspaces"),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey })
      qc.invalidateQueries({ queryKey: [...queryKey, id] })
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
