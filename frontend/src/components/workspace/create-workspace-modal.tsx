"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/components/i18n-provider"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"

function getSuggestedName(
  userName: string | null | undefined,
  t: (k: string, params?: Record<string, string>) => string
): string {
  const name = (userName ?? "").trim()
  if (name) return t("ws_suggested_with_name", { name })
  return t("ws_suggested_default")
}

export function CreateWorkspaceModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const { createWorkspace } = useWorkspaceStore()
  const shouldShow = open && !!user
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) setName(getSuggestedName(user?.name, t))
  }, [open, user?.name, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(t("admin_workspaces_name_required"))
      return
    }
    setCreating(true)
    try {
      await createWorkspace({ name: trimmed })
      toast.success(t("admin_workspaces_created_msg"))
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message || t("admin_workspaces_create_failed"))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={shouldShow} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("ws_create_title")}</DialogTitle>
            <DialogDescription>{t("ws_create_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">{t("ws_create_name_label")}</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("ws_create_name_placeholder")}
                autoFocus
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              {t("common_cancel")}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t("ws_create_creating") : t("ws_create_btn")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
