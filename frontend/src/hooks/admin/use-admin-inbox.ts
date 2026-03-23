import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface InboxSubmission {
  id: string
  type: string
  name: string
  email: string
  phone: string | null
  company: string | null
  title: string | null
  description: string
  status: string
  createdAt: string
}

interface InboxResponse {
  data: InboxSubmission[]
  total: number
  page?: number
  limit?: number
}

export function useAdminInbox(opts?: {
  page?: number
  limit?: number
  type?: string
  status?: string
}) {
  const params = new URLSearchParams()
  if (opts?.page) params.set("page", String(opts.page))
  if (opts?.limit) params.set("limit", String(opts.limit))
  if (opts?.type) params.set("type", opts.type)
  if (opts?.status) params.set("status", opts.status)

  return useQuery<InboxResponse>({
    queryKey: ["admin", "inbox", opts],
    queryFn: () => api.get(`/help-center/inbox?${params.toString()}`),
  })
}

export function useAdminInboxUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/help-center/inbox/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "inbox"] })
    },
  })
}
