import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

export interface EmailTemplate {
  id: string
  code: string
  name: string
  description: string | null
  subject: string
  bodyHtml: string
  variables: string[] | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EmailTemplateCode {
  code: string
  name: string
}

export function useAdminEmailTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: ["admin", "email-templates"],
    queryFn: () => api.get<EmailTemplate[]>("/admin/email-templates"),
  })
}

export function useAdminEmailTemplateCodes() {
  return useQuery<EmailTemplateCode[]>({
    queryKey: ["admin", "email-templates", "codes"],
    queryFn: () => api.get<EmailTemplateCode[]>("/admin/email-templates/codes"),
  })
}

export function useAdminEmailTemplateByCode(code: string | null) {
  return useQuery<EmailTemplate | null>({
    queryKey: ["admin", "email-templates", "by-code", code],
    queryFn: () =>
      code
        ? api.get<EmailTemplate | null>(`/admin/email-templates/by-code/${code}`)
        : Promise.resolve(null),
    enabled: !!code,
  })
}

export function useAdminEmailTemplateById(id: string | null) {
  return useQuery<EmailTemplate>({
    queryKey: ["admin", "email-templates", id],
    queryFn: () => api.get<EmailTemplate>(`/admin/email-templates/${id!}`),
    enabled: !!id,
  })
}

export type CreateEmailTemplateInput = {
  code: string
  name: string
  description?: string
  subject: string
  bodyHtml: string
  variables?: string[]
  isActive?: boolean
}

export type UpdateEmailTemplateInput = Partial<
  Omit<CreateEmailTemplateInput, "code">
>

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEmailTemplateInput) =>
      api.post<EmailTemplate>("/admin/email-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] })
    },
  })
}

export function useUpdateEmailTemplate(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateEmailTemplateInput) =>
      api.patch<EmailTemplate>(`/admin/email-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] })
    },
  })
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] })
    },
  })
}

export function useSendTestEmail(templateId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { toEmail: string; variables?: Record<string, string> }) =>
      api.post(`/admin/email-templates/${templateId}/test`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] })
    },
  })
}
