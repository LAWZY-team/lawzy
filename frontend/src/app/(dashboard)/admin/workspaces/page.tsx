"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  useAdminWorkspaces,
  useCreateAdminWorkspace,
  useUpdateAdminWorkspace,
  useDeleteAdminWorkspace,
  type AdminWorkspace,
} from "@/hooks/admin/use-admin-workspaces"
import { usePlansAdmin } from "@/hooks/plans/use-plans"
import { useT } from "@/components/i18n-provider"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

export default function AdminWorkspacesPage() {
  const { t } = useT()
  const [createOpen, setCreateOpen] = useState(false)
  const [editWorkspace, setEditWorkspace] = useState<AdminWorkspace | null>(null)
  const [deleteWorkspace, setDeleteWorkspace] = useState<AdminWorkspace | null>(null)
  const [createName, setCreateName] = useState("")
  const [createPlan, setCreatePlan] = useState("")
  const [editName, setEditName] = useState("")
  const [editPlan, setEditPlan] = useState("")

  const { data: workspaces, isLoading } = useAdminWorkspaces()
  const { data: plans } = usePlansAdmin()
  const createMutation = useCreateAdminWorkspace()
  const deleteMutation = useDeleteAdminWorkspace()

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error(t("admin_workspaces_name_required"))
      return
    }
    try {
      await createMutation.mutateAsync({ name: createName.trim(), plan: createPlan })
      toast.success(t("admin_workspaces_created_msg"))
      setCreateOpen(false)
      setCreateName("")
      setCreatePlan("")
    } catch (e) {
      toast.error((e as Error).message || t("admin_workspaces_create_failed"))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteWorkspace) return
    try {
      await deleteMutation.mutateAsync(deleteWorkspace.id)
      toast.success(t("admin_workspaces_deleted"))
      setDeleteWorkspace(null)
    } catch {
      toast.error(t("admin_workspaces_delete_failed"))
    }
  }

  const planOptions = plans ?? []

  const handleOpenCreate = () => {
    setCreateOpen(true)
    if (plans?.length) {
      const defaultPlan = plans.find((p) => p.price === 0) ?? plans[0]
      if (defaultPlan) setCreatePlan(defaultPlan.slug)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admin_workspaces_title")}</h2>
          <p className="text-muted-foreground">{t("admin_workspaces_desc")}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin_workspaces_create")}
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : !workspaces?.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {t("admin_workspaces_empty")}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_workspaces_name")}</TableHead>
                <TableHead>{t("admin_workspaces_plan")}</TableHead>
                <TableHead>{t("admin_workspaces_members")}</TableHead>
                <TableHead>{t("admin_workspaces_created")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((ws) => (
                <TableRow key={ws.id} className="group">
                  <TableCell>
                    <Link
                      href={`/admin/workspaces/${ws.id}`}
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      {ws.name}
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {ws.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {t("admin_users_members_count", { n: ws._count?.members ?? 0 })}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(ws.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/workspaces/${ws.id}`}>
                            <Users className="mr-2 h-4 w-4" />
                            {t("admin_workspaces_view_members")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditWorkspace(ws)
                            setEditName(ws.name)
                            setEditPlan(ws.plan || "")
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("admin_workspaces_rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteWorkspace(ws)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("admin_workspaces_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_workspaces_create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin_workspaces_name")}</Label>
              <Input
                placeholder={t("admin_workspaces_name_placeholder")}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin_workspaces_plan")}</Label>
              <Select value={createPlan} onValueChange={setCreatePlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "..." : t("admin_workspaces_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editWorkspace && (
        <EditWorkspaceDialog
          workspace={editWorkspace}
          name={editName}
          plan={editPlan}
          onNameChange={setEditName}
          onPlanChange={setEditPlan}
          onClose={() => {
            setEditWorkspace(null)
            setEditName("")
            setEditPlan("")
          }}
          onSaved={() => {
            setEditWorkspace(null)
            setEditName("")
            setEditPlan("")
          }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteWorkspace}
        onOpenChange={(open) => !open && setDeleteWorkspace(null)}
        title={t("admin_workspaces_delete_confirm_title")}
        desc={t("admin_workspaces_delete_confirm_desc", {
          name: deleteWorkspace?.name ?? "",
        })}
        destructive
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        confirmText={t("admin_workspaces_delete")}
      />
    </div>
  )
}

function EditWorkspaceDialog({
  workspace,
  name,
  plan,
  onNameChange,
  onPlanChange,
  onClose,
  onSaved,
}: {
  workspace: AdminWorkspace
  name: string
  plan: string
  onNameChange: (v: string) => void
  onPlanChange: (v: string) => void
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useT()
  const { data: plans } = usePlansAdmin()
  const updateMutation = useUpdateAdminWorkspace(workspace.id)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("admin_workspaces_name_required"))
      return
    }
    try {
      await updateMutation.mutateAsync({ name: name.trim(), plan: plan || undefined })
      toast.success(t("admin_workspaces_renamed"))
      onSaved()
    } catch {
      toast.error(t("admin_workspaces_rename_failed"))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin_workspaces_rename")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("admin_workspaces_name")}</Label>
            <Input
              placeholder={t("admin_workspaces_name_placeholder")}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_workspaces_plan")}</Label>
            <Select value={plan} onValueChange={onPlanChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin_workspaces_plan_select")} />
              </SelectTrigger>
              <SelectContent>
                {(plans ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.slug}>
                    {p.name} ({p.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common_cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "..." : t("common_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
