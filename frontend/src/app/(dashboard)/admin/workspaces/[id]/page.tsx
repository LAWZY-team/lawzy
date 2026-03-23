"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import {
  useAdminWorkspace,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  type WorkspaceWithMembers,
} from "@/hooks/admin/use-admin-workspaces"
import { useT } from "@/components/i18n-provider"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useParams } from "next/navigation"

export default function AdminWorkspaceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { t } = useT()
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addRole, setAddRole] = useState("viewer")
  const [removeMember, setRemoveMember] = useState<WorkspaceWithMembers["members"][0] | null>(null)

  const { data: workspace, isLoading } = useAdminWorkspace(id)
  const addMutation = useAddWorkspaceMember(id)
  const removeMutation = useRemoveWorkspaceMember(id)

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
    } catch (e) {
      toast.error((e as Error).message || t("admin_workspaces_member_add_failed"))
    }
  }

  const handleRemoveConfirm = async () => {
    if (!removeMember) return
    try {
      await removeMutation.mutateAsync(removeMember.user.id)
      toast.success(t("admin_workspaces_member_removed"))
      setRemoveMember(null)
    } catch {
      toast.error(t("admin_workspaces_member_remove_failed"))
    }
  }

  if (isLoading || !workspace) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const members = workspace.members ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/workspaces">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{workspace.name}</h2>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
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
          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("admin_workspaces_add_member")}
          </Button>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {t("admin_workspaces_no_members")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_workspaces_member_name")}</TableHead>
                <TableHead>{t("admin_workspaces_member_email")}</TableHead>
                <TableHead>{t("admin_workspaces_member_role")}</TableHead>
                <TableHead>{t("admin_workspaces_member_joined")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
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
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRemoveMember(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
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
                  <SelectItem value="member">Member</SelectItem>
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

      {/* Remove Confirm */}
      <ConfirmDialog
        open={!!removeMember}
        onOpenChange={(open) => !open && setRemoveMember(null)}
        title={t("admin_workspaces_remove_member_title")}
        desc={
          removeMember
            ? t("admin_workspaces_remove_member_desc", {
                name: removeMember.user.name ?? removeMember.user.email,
              })
            : ""
        }
        destructive
        onConfirm={handleRemoveConfirm}
        isLoading={removeMutation.isPending}
        confirmText={t("admin_workspaces_remove_member")}
      />
    </div>
  )
}
