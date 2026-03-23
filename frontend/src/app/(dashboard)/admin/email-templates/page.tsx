"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreVertical, Pencil, Plus, Mail, Trash2 } from "lucide-react"
import {
  useAdminEmailTemplates,
  useAdminEmailTemplateCodes,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useSendTestEmail,
} from "@/hooks/admin/use-admin-email-templates"
import type { EmailTemplate, CreateEmailTemplateInput } from "@/hooks/admin/use-admin-email-templates"
import { useT } from "@/components/i18n-provider"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

export default function AdminEmailTemplatesPage() {
  const { t } = useT()
  const [editModal, setEditModal] = useState<EmailTemplate | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)
  const [testTarget, setTestTarget] = useState<EmailTemplate | null>(null)
  const [testEmail, setTestEmail] = useState("")

  const { data: templates, isLoading } = useAdminEmailTemplates()
  const { data: codes } = useAdminEmailTemplateCodes()
  const createMutation = useCreateEmailTemplate()
  const updateMutation = useUpdateEmailTemplate(editModal?.id ?? "")
  const deleteMutation = useDeleteEmailTemplate()
  const sendTestMutation = useSendTestEmail(testTarget?.id ?? "")

  const existingCodes = new Set((templates ?? []).map((tmpl) => tmpl.code))
  const availableCodes = (codes ?? []).filter((c) => !existingCodes.has(c.code))

  const handleCreate = async (data: CreateEmailTemplateInput) => {
    try {
      await createMutation.mutateAsync(data)
      toast.success(t("admin_email_templates_created"))
      setCreateModal(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleUpdate = async (
    id: string,
    data: Partial<CreateEmailTemplateInput>
  ) => {
    try {
      await updateMutation.mutateAsync(data)
      toast.success(t("admin_email_templates_saved"))
      setEditModal(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(t("admin_email_templates_deleted"))
      setDeleteTarget(null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleSendTest = async () => {
    if (!testTarget || !testEmail.trim()) return
    try {
      await sendTestMutation.mutateAsync({ toEmail: testEmail.trim() })
      toast.success(t("admin_email_templates_test_sent"))
      setTestTarget(null)
      setTestEmail("")
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin_email_templates_title")}
          </h2>
          <p className="text-muted-foreground">
            {t("admin_email_templates_desc")}
          </p>
        </div>
        <Button
          onClick={() => setCreateModal(true)}
          disabled={availableCodes.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("admin_email_templates_create")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_email_templates_code")}</TableHead>
              <TableHead>{t("admin_email_templates_name")}</TableHead>
              <TableHead>{t("admin_email_templates_subject")}</TableHead>
              <TableHead>{t("admin_email_templates_status")}</TableHead>
              <TableHead>{t("admin_email_templates_updated")}</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : !templates?.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground h-32"
                >
                  {t("admin_email_templates_empty")}
                </TableCell>
              </TableRow>
            ) : (
              templates.map((tmpl) => (
                <TableRow key={tmpl.id}>
                  <TableCell className="font-mono text-sm">{tmpl.code}</TableCell>
                  <TableCell className="font-medium">{tmpl.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {tmpl.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tmpl.isActive ? "default" : "secondary"}>
                      {tmpl.isActive
                        ? t("admin_email_templates_active")
                        : t("admin_email_templates_inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(tmpl.updatedAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditModal(tmpl)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("admin_email_templates_edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setTestTarget(tmpl)
                            setTestEmail("")
                          }}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {t("admin_email_templates_send_test")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(tmpl)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TemplateFormModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        codes={availableCodes}
        mode="create"
      />

      {editModal && (
        <TemplateFormModal
          open={!!editModal}
          onClose={() => setEditModal(null)}
          onSubmit={(data) => handleUpdate(editModal.id, data)}
          isLoading={updateMutation.isPending}
          initialData={editModal}
          mode="edit"
        />
      )}

      <TestEmailModal
        open={!!testTarget}
        onClose={() => {
          setTestTarget(null)
          setTestEmail("")
        }}
        onSubmit={handleSendTest}
        isLoading={sendTestMutation.isPending}
        email={testEmail}
        onEmailChange={setTestEmail}
        templateName={testTarget?.name}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin_email_templates_delete_title")}
        desc={t("admin_email_templates_delete_desc")}
        cancelText={t("common_cancel")}
        confirmText={t("common_delete")}
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

function TemplateFormModal({
  open,
  onClose,
  onSubmit,
  isLoading,
  codes,
  initialData,
  mode,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateEmailTemplateInput) => void
  isLoading: boolean
  codes?: { code: string; name: string }[]
  initialData?: EmailTemplate
  mode: "create" | "edit"
}) {
  const { t } = useT()
  const [code, setCode] = useState(initialData?.code ?? "")
  const [name, setName] = useState(initialData?.name ?? "")
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  )
  const [subject, setSubject] = useState(initialData?.subject ?? "")
  const [bodyHtml, setBodyHtml] = useState(initialData?.bodyHtml ?? "")
  const [variables] = useState<string[]>(
    (initialData?.variables as string[]) ?? []
  )
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      code,
      name,
      description: description || undefined,
      subject,
      bodyHtml,
      variables: variables.length ? variables : undefined,
      isActive,
    })
  }

  const defaultBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <p>Xin chào <strong>{{toName}}</strong>,</p>
  <p>Nội dung email tại đây. Dùng biến: {{variableName}}</p>
  <p><a href="{{dashboardUrl}}" style="color: #f54900;">Mở Dashboard</a></p>
</body>
</html>`

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("admin_email_templates_create")
              : t("admin_email_templates_edit")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "create" && (
            <div className="space-y-2">
              <Label>{t("admin_email_templates_code")}</Label>
              <Select
                value={code}
                onValueChange={(v) => {
                  setCode(v)
                  const c = codes?.find((x) => x.code === v)
                  if (c) setName(c.name)
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin_email_templates_code_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {codes?.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} – {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label>{t("admin_email_templates_code")}</Label>
              <Input value={code} disabled className="bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("admin_email_templates_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin_email_templates_name_placeholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin_email_templates_description")} (tuỳ chọn)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn cho trigger này"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin_email_templates_subject")}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="[Lawzy] Tiêu đề email – dùng {{toName}}, {{workspaceName}}..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin_email_templates_body")}</Label>
            <textarea
              value={bodyHtml || defaultBody}
              onChange={(e) => setBodyHtml(e.target.value)}
              className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 font-mono text-sm"
              placeholder="HTML email. Dùng {{var}} cho biến."
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t("admin_email_templates_variables_hint")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">{t("admin_email_templates_is_active")}</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {mode === "create"
                ? t("admin_email_templates_create")
                : t("admin_email_templates_save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TestEmailModal({
  open,
  onClose,
  onSubmit,
  isLoading,
  email,
  onEmailChange,
  templateName,
}: {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  isLoading: boolean
  email: string
  onEmailChange: (v: string) => void
  templateName?: string
}) {
  const { t } = useT()
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin_email_templates_send_test")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {templateName && (
            <p className="text-sm text-muted-foreground">
              {t("admin_email_templates_test_for")}: {templateName}
            </p>
          )}
          <div className="space-y-2">
            <Label>{t("admin_email_templates_test_email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common_cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!email.trim() || isLoading}
          >
            {t("admin_email_templates_send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
