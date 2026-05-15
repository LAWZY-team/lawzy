"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Users, Trash2, MoreVertical } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminUsers, useDeleteAdminUser } from "@/hooks/admin/use-admin-users"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useT } from "@/components/i18n-provider"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

const ALL_VALUE = "__all__"

function UsersTable({
  users,
  isLoading,
  showWorkspacesColumn,
  totalPages,
  page,
  onPageChange,
  t,
}: {
  users: Array<{
    id: string
    name: string | null
    email: string
    avatar?: string | null
    roles?: string[]
    isVerified: boolean
    createdAt: string
    workspaces?: Array<{ id: string; name: string }>
  }>
  isLoading: boolean
  showWorkspacesColumn: boolean
  totalPages: number
  page: number
  onPageChange: (p: number) => void
  t: (k: string, params?: Record<string, string | number>) => string
}) {
  const { mutateAsync: deleteUser } = useDeleteAdminUser()
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete)
      toast.success(t("admin_users_deleted") || "Xóa người dùng thành công")
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast.error(
        err.response?.data?.message ||
        t("admin_users_delete_failed") || "Không thể xóa người dùng"
      )
    } finally {
      setUserToDelete(null)
    }
  }

  return (
    <>
      <AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin_users_delete_title") || "Xóa người dùng?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin_users_delete_desc") || "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa người dùng này khỏi hệ thống không?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("common_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_users_name")}</TableHead>
              <TableHead>{t("admin_users_email")}</TableHead>
              <TableHead>{t("admin_users_roles")}</TableHead>
              {showWorkspacesColumn && (
                <TableHead>{t("admin_users_workspaces")}</TableHead>
              )}
              <TableHead>{t("admin_users_verified_label")}</TableHead>
              <TableHead>{t("admin_users_joined")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  {showWorkspacesColumn && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showWorkspacesColumn ? 7 : 6}
                  className="h-32 text-center text-muted-foreground"
                >
                  {t("admin_users_empty")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {user.name?.slice(0, 2).toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {showWorkspacesColumn && (
                    <TableCell>
                      <div className="max-w-[180px] flex flex-wrap gap-1">
                        {(user.workspaces?.length ?? 0) > 0 ? (
                          user.workspaces?.map((ws) => (
                            <Badge key={ws.id} variant="secondary" className="text-xs">
                              {ws.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {user.isVerified ? (
                      <Badge variant="secondary">{t("admin_users_verified")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("admin_users_unverified")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setUserToDelete(user.id)}
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
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-sm">
            {t("pagination_page")} {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  )
}

export default function AdminUsersPage() {
  const { t } = useT()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState(ALL_VALUE)
  const [activeTab, setActiveTab] = useState<"users" | "workspaces">("users")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")
  const [page, setPage] = useState(1)

  const { workspaces, fetchWorkspaces } = useWorkspaceStore()
  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const fetchWorkspaceUsers =
    activeTab === "workspaces" && !!selectedWorkspaceId
  const { data: usersData, isLoading } = useAdminUsers({
    q: search || undefined,
    role: roleFilter === ALL_VALUE ? undefined : roleFilter || undefined,
    scope: fetchWorkspaceUsers ? "workspace" : "all",
    workspaceId: fetchWorkspaceUsers ? selectedWorkspaceId : undefined,
    page,
    limit: 20,
    enabled: activeTab === "users" || fetchWorkspaceUsers,
  })

  const users = activeTab === "workspaces" && !selectedWorkspaceId
    ? []
    : (usersData?.data ?? [])
  const totalPages = activeTab === "workspaces" && !selectedWorkspaceId
    ? 1
    : (usersData?.totalPages ?? 1)

  return (
    <ScrollArea>
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admin_users_title")}</h2>
          <p className="text-muted-foreground">{t("admin_users_desc")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as "users" | "workspaces")
        setSelectedWorkspaceId("")
        setPage(1)
      }}>
        <TabsList>
          <TabsTrigger value="users">{t("admin_users_tab_by_users")}</TabsTrigger>
          <TabsTrigger value="workspaces">{t("admin_users_tab_by_workspaces")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={t("admin_users_search_placeholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="max-w-xs"
            />
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("admin_users_roles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("admin_users_all")}</SelectItem>
                <SelectItem value="admin">{t("admin_users_admin")}</SelectItem>
                <SelectItem value="user">{t("admin_users_user")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <UsersTable
            users={users}
            isLoading={isLoading}
            showWorkspacesColumn={true}
            totalPages={totalPages}
            page={page}
            onPageChange={setPage}
            t={t}
          />
        </TabsContent>

        <TabsContent value="workspaces" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                {t("admin_storage_empty")}
              </div>
            ) : (
              workspaces.map((ws) => {
                const memberCount =
                  ws._count?.members ?? (ws as { memberCount?: number }).memberCount ?? 0
                return (
                  <Card
                    key={ws.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      selectedWorkspaceId === ws.id && "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedWorkspaceId(selectedWorkspaceId === ws.id ? "" : ws.id)
                      setPage(1)
                    }}
                  >
                    <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                      <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                        <AvatarImage src={ws.logo} alt={ws.name} />
                        <AvatarFallback className="rounded-lg">
                          {ws.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{ws.name}</div>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="capitalize">{ws.plan ?? "—"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {t("admin_users_members_count", { n: memberCount })}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })
            )}
          </div>

          {selectedWorkspaceId && (
            <div className="space-y-4">
              <h3 className="font-semibold">
                {t("admin_users_workspaces")} — {workspaces.find((w) => w.id === selectedWorkspaceId)?.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder={t("admin_users_search_placeholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="max-w-xs"
                />
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t("admin_users_roles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("admin_users_all")}</SelectItem>
                    <SelectItem value="admin">{t("admin_users_admin")}</SelectItem>
                    <SelectItem value="user">{t("admin_users_user")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <UsersTable
                users={users}
                isLoading={isLoading}
                showWorkspacesColumn={false}
                totalPages={totalPages}
                page={page}
                onPageChange={setPage}
                t={t}
              />
            </div>
          )}

          {!selectedWorkspaceId && workspaces.length > 0 && (
            <p className="text-center text-muted-foreground text-sm">
              {t("admin_users_select_workspace_hint")}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </ScrollArea>
  )
}
