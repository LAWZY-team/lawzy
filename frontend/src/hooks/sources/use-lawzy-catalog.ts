import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface LawzyCatalogItem {
  id: string
  title: string
  type: string
  status: string
  scope: string
  pageCount?: number | null
  chunkCount?: number | null
  tags?: Record<string, unknown> | null
  updatedAt: string
  createdAt: string
}

export interface LawzyCatalogResponse {
  data: LawzyCatalogItem[]
  total: number
  page: number
  limit: number
  systemSourceAccess: string
}

/**
 * Read-only Lawzy system/premium sources for the current workspace, scoped by plan quota.
 */
export const useLawzyCatalog = (
  workspaceId: string,
  opts?: { page?: number; limit?: number },
) => {
  const params = new URLSearchParams({ workspaceId })
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  return useQuery<LawzyCatalogResponse>({
    queryKey: ["lawzy-catalog", workspaceId, opts],
    queryFn: () => api.get(`/sources/lawzy-catalog?${params.toString()}`),
    enabled: !!workspaceId,
    refetchInterval: (query) => {
      const list = query.state.data?.data ?? []
      const hasInFlight = list.some(
        (s) => s.status === "pending" || s.status === "processing",
      )
      return hasInFlight ? 2500 : false
    },
  })
}
