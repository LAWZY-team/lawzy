"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Building2, Plus, Pencil, Trash2, Users, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/components/i18n-provider"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import useStore from "@/lib/zustand/use-store"
import { useWorkspaceStore } from "@/stores/workspace-store"
import {
  useWorkspace,
  useUpdateWorkspace,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  type WorkspaceWithMembers,
} from "@/hooks/workspaces/use-workspaces"

function MemberRow({
  m,
  canManage,
  onRemove,
  t,
}: {
  m: WorkspaceWithMembers["members"][0]
  canManage: boolean
  onRemove: () => void
  t: (k: string) => string
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={m.user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">
              {m.user.name?.slice(0, 2).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{m.user.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{m.user.email}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {m.role}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDistanceToNow(new Date(m.joinedAt), {
          addSuffix: true,
          locale: vi,
        })}
      </TableCell>
      {canManage && (
        <TableCell className="w-[60px]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  )
}

export default function WorkspacePage() {
  const { t } = useT()
  const workspaceStore = useStore(useWorkspaceStore, (s) => s)
  const currentWorkspace = workspaceStore?.currentWorkspace ?? null
  const fetchWorkspaces = workspaceStore?.fetchWorkspaces

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState("viewer")
  const [removeMember, setRemoveMember] = useState<WorkspaceWithMembers["members"][0] | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    fetchWorkspaces?.()
  }, [fetchWorkspaces])

  useEffect(() => {
    if (currentWorkspace?.id) {
      setWorkspaceId(currentWorkspace.id)
    } else if (workspaceStore?.workspaces?.length) {
      const first = workspaceStore.workspaces[0]
      setWorkspaceId(first.id)
      workspaceStore.setCurrentWorkspace?.(first)
    } else {
      setWorkspaceId(null)
    }
  }, [currentWorkspace?.id, workspaceStore?.workspaces])

  const { data: workspace, isLoading } = useWorkspace(workspaceId)
  const updateMutation = useUpdateWorkspace(workspaceId ?? "")
  const addMutation = useAddWorkspaceMember(workspaceId ?? "")
  const removeMutation = useRemoveWorkspaceMember(workspaceId ?? "")

  const myRole = workspaceStore?.workspaces?.find((w) => w.id === workspaceId)?.role ?? "viewer"
  const canManage = myRole === "admin" || myRole === "editor"

  const handleAddMember = async () => {
    if (!addEmail.trim()) {
      toast.error(t("admin_workspaces_member_email_required"))
      return
    }
    try {
      await addMutation.mutateAsync({ email: addEmail.trim(), role: addRole })
      toast.success(t("admin_workspaces_member_added"))
      setAddMemberOpen(false)
      setAddEmail("")
      setAddRole("viewer")
      fetchWorkspaces?.()
    } catch (e) {
      const err = e as Error
      if (err.message === "MEMBER_LIMIT_REACHED") {
        setAddMemberOpen(false)
        setUpgradeOpen(true)
      } else {
        toast.error(err.message || t("admin_workspaces_member_add_failed"))
      }
    }
  }

  const handleRemoveConfirm = async () => {
    if (!removeMember) return
    try {
      await removeMutation.mutateAsync(removeMember.user.id)
      toast.success(t("admin_workspaces_member_removed"))
      setRemoveMember(null)
      fetchWorkspaces?.()
    } catch {
      toast.error(t("admin_workspaces_member_remove_failed"))
    }
  }

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue === workspace?.name) {
      setRenameOpen(false)
      return
    }
    try {
      await updateMutation.mutateAsync({ name: renameValue.trim() })
      toast.success(t("admin_workspaces_renamed"))
      workspaceStore?.setCurrentWorkspace?.(
        workspace ? { ...workspace, name: renameValue.trim() } : ({} as never)
      )
      setRenameOpen(false)
    } catch {
      toast.error(t("admin_workspaces_rename_failed"))
    }
  }

  const members = workspace?.members ?? []

  if (!workspaceId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t("workspace_title")}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t("workspace_desc")} Chọn workspace từ menu bên trái để bắt đầu.
        </p>
      </div>
    )
  }

  if (isLoading || !workspace) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{workspace.name}</h2>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setRenameValue(workspace.name)
                  setRenameOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm mt-1">
            <Badge variant="outline" className="capitalize">
              {workspace.plan}
            </Badge>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t("admin_users_members_count", { n: members.length })}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("admin_workspaces_members")}</h3>
          {canManage && (
            <Button size="sm" onClick={() => setAddMemberOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("admin_workspaces_add_member")}
            </Button>
          )}
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t("admin_workspaces_no_members")}
            {canManage && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setAddMemberOpen(true)}
              >
                {t("admin_workspaces_add_member")}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_workspaces_member_name")}</TableHead>
                <TableHead>{t("admin_workspaces_member_email")}</TableHead>
                <TableHead>{t("admin_workspaces_member_role")}</TableHead>
                <TableHead>{t("admin_workspaces_member_joined")}</TableHead>
                {canManage && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  canManage={canManage}
                  onRemove={() => setRemoveMember(m)}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_workspaces_add_member")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin_workspaces_member_email")}</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin_workspaces_member_role")}</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button onClick={handleAddMember} disabled={addMutation.isPending}>
              {addMutation.isPending ? "..." : t("admin_workspaces_add_member")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade required (member limit) */}
      <AlertDialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workspace_upgrade_cta")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("workspace_member_limit_reached")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button asChild>
              <Link href="/payment">
                {t("workspace_upgrade_cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove member confirm */}
      <AlertDialog open={!!removeMember} onOpenChange={(o) => !o && setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin_workspaces_remove_member_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeMember
                ? t("admin_workspaces_remove_member_desc", {
                    name: removeMember.user.name ?? removeMember.user.email,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRemoveMember(null)}>
              {t("common_cancel")}
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                handleRemoveConfirm()
              }}
            >
              {removeMutation.isPending ? "..." : t("admin_workspaces_remove_member")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename workspace */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("workspace_rename")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin_workspaces_name")}</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder={t("admin_workspaces_name_placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button
              onClick={handleRename}
              disabled={updateMutation.isPending || !renameValue.trim()}
            >
              {updateMutation.isPending ? "..." : t("admin_workspaces_rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
