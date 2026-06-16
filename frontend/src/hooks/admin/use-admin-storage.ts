import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface StorageBreakdownItem {
  workspaceId: string
  workspaceName: string
  plan: string
  storageUsed: number
  storageLimit: number
  percent: number
}

export interface AdminStorageOverview {
  totalUsed: number
  breakdown: StorageBreakdownItem[]
}

export function useAdminStorageOverview(opts?: { fromR2?: boolean }) {
  const params = opts?.fromR2 ? "?from=r2" : ""
  return useQuery<AdminStorageOverview>({
    queryKey: ["admin", "storage", "overview", opts?.fromR2],
    queryFn: () => api.get(`/admin/storage/overview${params}`),
  })
}
