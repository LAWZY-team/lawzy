"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Plus, Trash2, Building2, Check, X } from "lucide-react"
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
import {
  USER_FIELD_GROUP_LABELS,
  USER_FIELD_OTHER_GROUP_LABEL,
  getUserFieldGroupForSettings,
  type UserFieldSettingsGroupId,
} from "@/lib/editor/user-field-profile"

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

function EditableCellInput({
  value,
  onChange,
  disabled,
  className,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const isFocused = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(value)
    }
  }, [value])

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const save = useCallback((val: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    onChangeRef.current(val)
  }, [])

  useEffect(() => {
    if (localValue === value) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      save(localValue)
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [localValue, value, save])

  const handleBlur = () => {
    isFocused.current = false
    save(localValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
  }

  return (
    <Input
      value={localValue}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => {
        isFocused.current = true
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  )
}

function InlineAddRow({
  onSave,
  onCancel,
  t,
}: {
  onSave: (label: string, defaultValue: string) => void
  onCancel: () => void
  t: any
}) {
  const [label, setLabel] = useState("")
  const [defaultValue, setDefaultValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [])

  const keyPreview = useMemo(() => {
    return label.trim() ? (slugifyKey(label) || '...') : '...'
  }, [label])

  const handleSave = () => {
    if (!label.trim()) return
    onSave(label, defaultValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell>
        <span className="text-sm text-muted-foreground">{t("settings_fields_user")}</span>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground/60">
        {keyPreview}
      </TableCell>
      <TableCell>
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("fields_placeholder_label")}
          className="h-8 text-sm max-w-[280px]"
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <Input
          value={defaultValue}
          onChange={(e) => setDefaultValue(e.target.value)}
          placeholder={t("fields_placeholder_default")}
          className="h-8 text-sm max-w-[320px]"
          onKeyDown={handleKeyDown}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary hover:text-primary"
            onClick={handleSave}
            disabled={!label.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AddFieldDialogContent({
  currentWorkspace,
  canEditWs,
  onCancel,
  onSaveUser,
  onSaveWorkspace,
  wsSaving,
  t,
}: {
  currentWorkspace: any
  canEditWs: boolean
  onCancel: () => void
  onSaveUser: (label: string, defaultValue: string, category: string) => void
  onSaveWorkspace: (label: string, defaultValue: string) => Promise<void>
  wsSaving: boolean
  t: any
}) {
  const [source, setSource] = useState<"user" | "workspace">("user")
  const [label, setLabel] = useState("")
  const [defaultValue, setDefaultValue] = useState("")
  const [category, setCategory] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim()) return
    setIsSaving(true)
    try {
      if (source === "user") {
        onSaveUser(label, defaultValue, category)
      } else {
        await onSaveWorkspace(label, defaultValue)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("fields_add_custom")}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {currentWorkspace && canEditWs && (
          <div className="space-y-2">
            <Label>{t("settings_fields_source")}</Label>
            <Select
              value={source}
              onValueChange={(v: "user" | "workspace") => setSource(v)}
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("fields_placeholder_example_label")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("settings_fields_default")}</Label>
          <Input
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            placeholder={t("fields_placeholder_default")}
          />
        </div>
        {source === "user" && (
          <div className="space-y-2">
            <Label>
              {t("fields_category_name")}
              <span className="ml-1 text-xs text-muted-foreground font-normal">{t("fields_optional")}</span>
            </Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("fields_placeholder_example_category")}
            />
            <p className="text-xs text-muted-foreground">
              {t("fields_category_hint")}
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving || wsSaving}>
          {t("common_cancel")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!label.trim() || isSaving || wsSaving}
        >
          {isSaving || wsSaving ? "..." : t("common_save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
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
  const [addDialog, setAddDialog] = useState<"user" | "workspace" | null>(null)
  const wsFieldsRef = useRef<WorkspaceFieldItem[]>([])
  const wsPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "user" | "workspace"
    key: string
  } | null>(null)
  const [inlineAdd, setInlineAdd] = useState<{
    groupId: UserFieldSettingsGroupId | null
    label: string
    defaultValue: string
  }>({ groupId: null, label: '', defaultValue: '' })

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

  useEffect(() => {
    wsFieldsRef.current = wsFields
  }, [wsFields])

  const persistWorkspaceFields = useCallback(async () => {
    if (!currentWorkspace?.id) return
    const fields = wsFieldsRef.current
    setWsSaving(true)
    try {
      await api.put(`/workspaces/${currentWorkspace.id}/custom-fields`, {
        fields: fields.map((f) => ({
          key: f.key,
          label: f.label,
          defaultValue: f.defaultValue || null,
        })),
      })
    } catch {
      toast.error(t("fields_save_failed"))
    } finally {
      setWsSaving(false)
    }
  }, [currentWorkspace?.id])

  const scheduleWorkspacePersist = useCallback(() => {
    if (wsPersistTimerRef.current) clearTimeout(wsPersistTimerRef.current)
    wsPersistTimerRef.current = setTimeout(() => {
      wsPersistTimerRef.current = null
      void persistWorkspaceFields()
    }, 450)
  }, [persistWorkspaceFields])

  useEffect(() => {
    return () => {
      if (wsPersistTimerRef.current) clearTimeout(wsPersistTimerRef.current)
    }
  }, [])



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
      toast.error(t("fields_delete_failed"))
    } finally {
      setWsSaving(false)
    }
  }

  const handleInlineAddSave = useCallback((label: string, defaultValue: string) => {
    const key = slugifyKey(label) || 'field'
    addCustomField({
      key,
      label: label.trim(),
      defaultValue: defaultValue.trim(),
    })
    setInlineAdd({ groupId: null, label: '', defaultValue: '' })
  }, [addCustomField])

  const handleInlineAddCancel = useCallback(() => {
    setInlineAdd({ groupId: null, label: '', defaultValue: '' })
  }, [])

  const myRole = workspaceStore?.workspaces?.find(
    (w) => w.id === currentWorkspace?.id
  )?.role ?? "viewer"
  const canEditWs = myRole === "admin" || myRole === "editor"

  const hasUserFields = userFields.length > 0
  const hasWsFields = Boolean(currentWorkspace && wsFields.length > 0)
  const isEmpty = !hasUserFields && !hasWsFields

  const SETTINGS_GROUP_ORDER: UserFieldSettingsGroupId[] = [
    "basic",
    "representative",
    "contract_profile",
    "other",
  ]

  const customFieldCategoryMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const f of customFields) {
      if (f.category) m[f.key] = f.category
    }
    return m
  }, [customFields])

  const userFieldsByGroup = (gid: UserFieldSettingsGroupId) =>
    userFields.filter((item) => {
      if (gid === 'other' && customFieldCategoryMap[item.key]) return false
      return getUserFieldGroupForSettings(item.key) === gid
    })

  const customCategoryGroups: Array<{ category: string; items: FieldItem[] }> = useMemo(() => {
    const map = new Map<string, FieldItem[]>()
    for (const item of userFields) {
      const cat = customFieldCategoryMap[item.key]
      if (cat && getUserFieldGroupForSettings(item.key) === 'other') {
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(item)
      }
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
  }, [userFields, customFieldCategoryMap])

  const renderFieldRow = (type: "user" | "workspace", item: FieldItem) => {
    const canEditRow = type === "user" || canEditWs
    return (
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
        <TableCell className="font-mono text-sm align-middle">{item.key}</TableCell>
        <TableCell className="align-middle">
          {type === "user" ? (
            <EditableCellInput
              value={item.label}
              disabled={!canEditRow}
              className="h-9 max-w-[280px]"
              onChange={(newVal) =>
                updateCustomField(item.key, { label: newVal })
              }
            />
          ) : (
            <EditableCellInput
              value={item.label}
              disabled={!canEditRow}
              className="h-9 max-w-[280px]"
              onChange={(newVal) => {
                setWsFields((prev) => {
                  const next = prev.map((f) =>
                    f.key === item.key ? { ...f, label: newVal } : f
                  )
                  wsFieldsRef.current = next
                  return next
                })
                scheduleWorkspacePersist()
              }}
            />
          )}
        </TableCell>
        <TableCell className="align-middle">
          {type === "user" ? (
            <EditableCellInput
              value={item.defaultValue}
              disabled={!canEditRow}
              className="h-9 max-w-[320px]"
              placeholder="—"
              onChange={(newVal) =>
                updateCustomField(item.key, { defaultValue: newVal })
              }
            />
          ) : (
            <EditableCellInput
              value={item.defaultValue}
              disabled={!canEditRow}
              className="h-9 max-w-[320px]"
              placeholder="—"
              onChange={(newVal) => {
                const v = newVal
                setWsFields((prev) => {
                  const next = prev.map((f) =>
                    f.key === item.key ? { ...f, defaultValue: v } : f
                  )
                  wsFieldsRef.current = next
                  return next
                })
                scheduleWorkspacePersist()
              }}
            />
          )}
        </TableCell>
        <TableCell className="align-middle">
          {canEditRow && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm({ type, key: item.key })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    )
  }

  const renderUserGroupTable = (gid: UserFieldSettingsGroupId, title: string) => {
    const items = userFieldsByGroup(gid)
    const isAddingHere = inlineAdd.groupId === gid
    if (items.length === 0 && !isAddingHere) return null
    const keyPreview = inlineAdd.label.trim() ? (slugifyKey(inlineAdd.label) || '...') : '...'
    return (
      <div key={gid} className="rounded-md border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={() => setInlineAdd({ groupId: gid, label: '', defaultValue: '' })}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("fields_add_btn")}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t("settings_fields_source")}</TableHead>
              <TableHead>{t("settings_fields_key")}</TableHead>
              <TableHead>{t("settings_fields_label")}</TableHead>
              <TableHead>{t("settings_fields_default")}</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => renderFieldRow("user", item))}
            {isAddingHere && (
              <InlineAddRow
                onSave={handleInlineAddSave}
                onCancel={handleInlineAddCancel}
                t={t}
              />
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div id="tour-settings-content" className="flex flex-1 flex-col gap-4 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("sidebar_profile")}</h2>
          <p className="text-muted-foreground">{t("sidebar_profile_desc")}</p>
        </div>
        <Button onClick={() => setAddDialog("user")} disabled={wsLoading}>
          <Plus className="mr-2 h-4 w-4" />
          {t("fields_add_custom")}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {wsLoading && !hasUserFields && !hasWsFields ? (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">{t("settings_fields_source")}</TableHead>
                  <TableHead>{t("settings_fields_key")}</TableHead>
                  <TableHead>{t("settings_fields_label")}</TableHead>
                  <TableHead>{t("settings_fields_default")}</TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border bg-card">
            <Table>
              <TableBody>
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
              </TableBody>
            </Table>
          </div>
        ) : (
          <>
            {SETTINGS_GROUP_ORDER.map((gid) => {
              if (gid === "other") {
                return renderUserGroupTable("other", USER_FIELD_OTHER_GROUP_LABEL)
              }
              return renderUserGroupTable(gid, USER_FIELD_GROUP_LABELS[gid])
            })}
            {customCategoryGroups.map(({ category, items }) => (
              <div key={`custom-cat-${category}`} className="rounded-md border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-4 py-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{category}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => setInlineAdd({ groupId: 'other', label: '', defaultValue: '' })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("fields_add_btn")}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">{t("settings_fields_source")}</TableHead>
                      <TableHead>{t("settings_fields_key")}</TableHead>
                      <TableHead>{t("settings_fields_label")}</TableHead>
                      <TableHead>{t("settings_fields_default")}</TableHead>
                      <TableHead className="w-[88px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>{items.map((item) => renderFieldRow("user", item))}</TableBody>
                </Table>
              </div>
            ))}
            {hasWsFields && currentWorkspace && (
              <div className="rounded-md border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {currentWorkspace.name}
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">{t("settings_fields_source")}</TableHead>
                      <TableHead>{t("settings_fields_key")}</TableHead>
                      <TableHead>{t("settings_fields_label")}</TableHead>
                      <TableHead>{t("settings_fields_default")}</TableHead>
                      <TableHead className="w-[72px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wsFields.map((item) => renderFieldRow("workspace", item))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add dialog */}
      <Dialog
        open={!!addDialog}
        onOpenChange={(o) => {
          if (!o) setAddDialog(null)
        }}
      >
        {addDialog && (
          <AddFieldDialogContent
            currentWorkspace={currentWorkspace}
            canEditWs={canEditWs}
            onCancel={() => setAddDialog(null)}
            onSaveUser={(label, defaultValue, category) => {
              const key = slugifyKey(label) || "field"
              addCustomField({
                key,
                label: label.trim(),
                defaultValue: defaultValue.trim(),
                ...(category.trim() ? { category: category.trim() } : {}),
              })
              setAddDialog(null)
            }}
            onSaveWorkspace={async (label, defaultValue) => {
              if (!currentWorkspace?.id) return
              const key = slugifyKey(label) || "field"
              const updated = [
                ...wsFields,
                { key, label: label.trim(), defaultValue: defaultValue.trim() },
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
                toast.success(t("common_save") + "!")
              } catch {
                toast.error(t("fields_save_failed"))
              } finally {
                setWsSaving(false)
              }
            }}
            wsSaving={wsSaving}
            t={t}
          />
        )}
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
              {t("fields_delete_desc")}
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
