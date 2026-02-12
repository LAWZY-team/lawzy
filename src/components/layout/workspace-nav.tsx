"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Mock data - will be replaced with real data from store
const workspaces = [
  {
    id: "org001",
    name: "Công ty ABC",
    logo: "/logos/abc-company.png",
    plan: "pro",
  },
]

export function WorkspaceNav() {
  const { isMobile } = useSidebar()
  const [activeWorkspace] = React.useState(workspaces[0])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={activeWorkspace.logo} alt={activeWorkspace.name} />
                <AvatarFallback className="rounded-lg">
                  {activeWorkspace.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeWorkspace.name}</span>
                <span className="truncate text-xs capitalize">{activeWorkspace.plan}</span>
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
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className="gap-2 p-2"
              >
                <Avatar className="h-6 w-6 rounded-md">
                  <AvatarImage src={workspace.logo} alt={workspace.name} />
                  <AvatarFallback className="rounded-md">
                    {workspace.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{workspace.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {workspace.plan}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                <Plus className="h-4 w-4" />
              </div>
              <div className="font-medium text-muted-foreground">Tạo workspace mới</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
