import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface WorkspaceFieldItem {
  id?: string
  key: string
  label: string
  defaultValue: string | null
  isHidden?: boolean
}

async function fetchWorkspaceFields(workspaceId: string): Promise<WorkspaceFieldItem[]> {
  const data = await api.get<WorkspaceFieldItem[]>(
    `/workspaces/${workspaceId}/custom-fields`
  )
  return Array.isArray(data) ? data : []
}

export function useWorkspaceFields(workspaceId: string | null) {
  return useQuery({
    queryKey: ["workspaces", workspaceId, "custom-fields"],
    queryFn: () => fetchWorkspaceFields(workspaceId!),
    enabled: !!workspaceId,
  })
}
