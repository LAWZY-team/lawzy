"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, LayoutGrid } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useT } from "@/components/i18n-provider"
import { CreateWorkspaceModal } from "@/components/workspace/create-workspace-modal"

export function WorkspaceNav() {
  const { t } = useT()
  const { isMobile } = useSidebar()
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    loginScopedWorkspaceId,
    setLoginScopedWorkspaceId,
    fetchWorkspaces,
  } = useWorkspaceStore()
  const [createOpen, setCreateOpen] = React.useState(false)
  const activeWorkspace = currentWorkspace ?? workspaces[0]

  if (workspaces.length === 0) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              id="tour-workspace-create"
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              onClick={() => setCreateOpen(true)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted">
                <Plus className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium">{t("ws_create_first")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{activeWorkspace?.name}</span>
                  <span className="truncate text-xs capitalize">{activeWorkspace?.plan ?? "—"}</span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t("sidebar_workspaces")}
              </DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  className="gap-2 p-2"
                  onClick={() => setCurrentWorkspace(workspace)}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-muted">
                    <LayoutGrid className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{workspace.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {workspace.plan ?? "—"}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              {loginScopedWorkspaceId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 p-2 cursor-pointer"
                    onClick={() => {
                      setLoginScopedWorkspaceId(null)
                      fetchWorkspaces()
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-muted-foreground/30">
                      <LayoutGrid className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="font-medium text-muted-foreground">{t("ws_view_all")}</div>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2 cursor-pointer"
                onClick={() => setCreateOpen(true)}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="font-medium text-muted-foreground">{t("ws_create_new")}</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateWorkspaceModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
