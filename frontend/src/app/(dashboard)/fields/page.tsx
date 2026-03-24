"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/components/i18n-provider"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import useStore from "@/lib/zustand/use-store"

type FieldItem = { key: string; label: string; defaultValue: string }
type WorkspaceFieldItem = FieldItem & { id?: string; isHidden?: boolean }

function slugifyKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50)
}

export default function FieldsPage() {
  const { t } = useT()
  const workspaceStore = useStore(useWorkspaceStore, (s) => s)
  const currentWorkspace = workspaceStore?.currentWorkspace ?? null
  const { customFields, addCustomField, addSampleFields, updateCustomField, removeCustomField } =
    useUserFieldsStore()

  const [userFields, setUserFields] = useState<FieldItem[]>([])
  const [wsFields, setWsFields] = useState<WorkspaceFieldItem[]>([])
  const [wsLoading, setWsLoading] = useState(false)
  const [wsSaving, setWsSaving] = useState(false)
  const [editDialog, setEditDialog] = useState<{
    type: "user" | "workspace"
    key: string
    label: string
    defaultValue: string
  } | null>(null)
  const [addDialog, setAddDialog] = useState<"user" | "workspace" | null>(null)
  const [newField, setNewField] = useState({ label: "", defaultValue: "" })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "user" | "workspace"
    key: string
  } | null>(null)

  useEffect(() => {
    setUserFields(
      customFields.map((f) => ({
        key: f.key,
        label: f.label,
        defaultValue: f.defaultValue ?? "",
      }))
    )
  }, [customFields])

  useEffect(() => {
    if (currentWorkspace?.id) {
      setWsLoading(true)
      api
        .get<WorkspaceFieldItem[]>(`/workspaces/${currentWorkspace.id}/custom-fields`)
        .then((data) =>
          setWsFields(
            Array.isArray(data)
              ? data.map((r) => ({
                  key: r.key,
                  label: r.label,
                  defaultValue: r.defaultValue ?? "",
                  id: r.id,
                  isHidden: r.isHidden,
                }))
              : []
          )
        )
        .catch(() => setWsFields([]))
        .finally(() => setWsLoading(false))
    } else {
      setWsFields([])
      setWsLoading(false)
    }
  }, [currentWorkspace?.id])

  const handleAddUserField = () => {
    if (!newField.label.trim()) return
    const key = slugifyKey(newField.label) || "field"
    addCustomField({
      key,
      label: newField.label.trim(),
      defaultValue: newField.defaultValue.trim(),
    })
    setAddDialog(null)
    setNewField({ label: "", defaultValue: "" })
  }

  const handleAddWsField = async () => {
    if (!currentWorkspace?.id || !newField.label.trim()) return
    const key = slugifyKey(newField.label) || "field"
    const updated = [
      ...wsFields,
      { key, label: newField.label.trim(), defaultValue: newField.defaultValue.trim() },
    ]
    setWsSaving(true)
    try {
      await api.put(`/workspaces/${currentWorkspace.id}/custom-fields`, {
        fields: updated.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue || null,
        })),
      })
      setWsFields(updated)
      setAddDialog(null)
      setNewField({ label: "", defaultValue: "" })
      toast.success(t("common_save") + "!")
    } catch {
      toast.error("Lưu thất bại")
    } finally {
      setWsSaving(false)
    }
  }

  const handleEditUserField = () => {
    if (!editDialog || editDialog.type !== "user") return
    updateCustomField(editDialog.key, {
      label: editDialog.label,
      defaultValue: editDialog.defaultValue,
    })
    setEditDialog(null)
  }

  const handleEditWsField = async () => {
    if (!editDialog || editDialog.type !== "workspace" || !currentWorkspace?.id) return
    const idx = wsFields.findIndex((f) => f.key === editDialog.key)
    if (idx < 0) return
    const updated = [...wsFields]
    updated[idx] = {
      ...updated[idx],
      label: editDialog.label,
      defaultValue: editDialog.defaultValue,
    }
    setWsSaving(true)
    try {
      await api.put(`/workspaces/${currentWorkspace.id}/custom-fields`, {
        fields: updated.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue || null,
        })),
      })
      setWsFields(updated)
      setEditDialog(null)
      toast.success(t("common_save") + "!")
    } catch {
      toast.error("Lưu thất bại")
    } finally {
      setWsSaving(false)
    }
  }

  const handleDeleteUserField = () => {
    if (deleteConfirm?.type === "user") {
      removeCustomField(deleteConfirm.key)
      setDeleteConfirm(null)
    }
  }

  const handleDeleteWsField = async () => {
    if (deleteConfirm?.type !== "workspace" || !currentWorkspace?.id) return
    const updated = wsFields.filter((f) => f.key !== deleteConfirm.key)
    setWsSaving(true)
    try {
      await api.put(`/workspaces/${currentWorkspace.id}/custom-fields`, {
        fields: updated.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue || null,
        })),
      })
      setWsFields(updated)
      setDeleteConfirm(null)
      toast.success(t("common_delete") + "!")
    } catch {
      toast.error("Xóa thất bại")
    } finally {
      setWsSaving(false)
    }
  }

  const myRole = workspaceStore?.workspaces?.find(
    (w) => w.id === currentWorkspace?.id
  )?.role ?? "viewer"
  const canEditWs = myRole === "admin" || myRole === "editor"

  const allFields: { type: "user" | "workspace"; item: FieldItem }[] = [
    ...userFields.map((item) => ({ type: "user" as const, item })),
    ...(currentWorkspace ? wsFields.map((item) => ({ type: "workspace" as const, item })) : []),
  ]
  const hasUserFields = userFields.length > 0
  const hasWsFields = currentWorkspace && wsFields.length > 0
  const isEmpty = !hasUserFields && !hasWsFields

  return (
    <div id="tour-settings-content" className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("sidebar_profile")}</h2>
          <p className="text-muted-foreground">{t("sidebar_profile_desc")}</p>
        </div>
        <Button onClick={() => setAddDialog("user")} disabled={wsLoading}>
          <Plus className="mr-2 h-4 w-4" />
          {t("settings_fields_add")}
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t("settings_fields_source")}</TableHead>
              <TableHead>{t("settings_fields_key")}</TableHead>
              <TableHead>{t("settings_fields_label")}</TableHead>
              <TableHead>{t("settings_fields_default")}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {wsLoading && allFields.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <p className="text-muted-foreground max-w-sm">
                      {t("settings_fields_empty_hint")}
                    </p>
                    <Button
                      onClick={() => {
                        addSampleFields()
                        toast.success(t("settings_fields_sample_added"))
                      }}
                      variant="default"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t("settings_fields_add_sample")}
                    </Button>
                    <p className="text-xs text-muted-foreground/80 max-w-xs">
                      {t("settings_fields_sample_hint")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              allFields.map(({ type, item }) => (
                <TableRow key={`${type}-${item.key}`}>
                  <TableCell>
                    {type === "user" ? (
                      <span className="text-sm">{t("settings_fields_user")}</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Building2 className="h-4 w-4" />
                        {currentWorkspace?.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.key}</TableCell>
                  <TableCell>{item.label}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {item.defaultValue || "—"}
                  </TableCell>
                  <TableCell>
                    {(type === "user" || canEditWs) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setEditDialog({
                              type,
                              key: item.key,
                              label: item.label,
                              defaultValue: item.defaultValue,
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirm({ type, key: item.key })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add dialog */}
      <Dialog
        open={!!addDialog}
        onOpenChange={(o) => {
          if (!o) {
            setAddDialog(null)
            setNewField({ label: "", defaultValue: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings_fields_add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {currentWorkspace && canEditWs && (
              <div className="space-y-2">
                <Label>{t("settings_fields_source")}</Label>
                <Select
                  value={addDialog ?? "user"}
                  onValueChange={(v: "user" | "workspace") => setAddDialog(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("settings_fields_user")}</SelectItem>
                    <SelectItem value="workspace">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {currentWorkspace.name}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("settings_fields_label")}</Label>
              <Input
                value={newField.label}
                onChange={(e) =>
                  setNewField((n) => ({ ...n, label: e.target.value }))
                }
                placeholder="Ví dụ: Tên doanh nghiệp"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings_fields_default")}</Label>
              <Input
                value={newField.defaultValue}
                onChange={(e) =>
                  setNewField((n) => ({ ...n, defaultValue: e.target.value }))
                }
                placeholder="Giá trị mặc định (tùy chọn)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialog(null)
                setNewField({ label: "", defaultValue: "" })
              }}
            >
              {t("common_cancel")}
            </Button>
            <Button
              onClick={() =>
                addDialog === "user" ? handleAddUserField() : handleAddWsField()
              }
              disabled={
                !newField.label.trim() ||
                (addDialog === "workspace" && wsSaving)
              }
            >
              {addDialog === "workspace" && wsSaving ? "..." : t("common_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Sửa trường — {editDialog?.key}
            </DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("settings_fields_label")}</Label>
                <Input
                  value={editDialog.label}
                  onChange={(e) =>
                    setEditDialog((d) => d && { ...d, label: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings_fields_default")}</Label>
                <Input
                  value={editDialog.defaultValue}
                  onChange={(e) =>
                    setEditDialog((d) =>
                      d ? { ...d, defaultValue: e.target.value } : null
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              {t("common_cancel")}
            </Button>
            <Button
              onClick={() =>
                editDialog?.type === "user"
                  ? handleEditUserField()
                  : handleEditWsField()
              }
              disabled={
                !editDialog?.label.trim() ||
                (editDialog?.type === "workspace" && wsSaving)
              }
            >
              {editDialog?.type === "workspace" && wsSaving ? "..." : t("common_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common_delete")}?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa trường này? Giá trị đã điền trong hợp đồng sẽ không bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t("common_cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:text-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (deleteConfirm?.type === "user") {
                  handleDeleteUserField()
                } else {
                  handleDeleteWsField()
                }
              }}
            >
              {t("common_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
