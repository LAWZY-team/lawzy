"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  FolderInput,
  Library,
  Settings,
  CreditCard,
  Users,
  HardDrive,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { WorkspaceNav } from "./workspace-nav"
import { UserNav } from "./user-nav"
import { cn } from "@/lib/utils"

const navGroups = [
  {
    label: "Không gian làm việc",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Văn bản", href: "/documents", icon: FileText },
      { title: "Nguồn", href: "/sources", icon: FolderInput },
    ],
  },
  {
    label: "Thư viện",
    items: [
      { title: "Mẫu hợp đồng", href: "/templates", icon: Library },
    ],
  },
  {
    label: "Cài đặt",
    items: [
      { title: "Workspace", href: "/workspace", icon: Users },
      { title: "Tập tin & Dung lượng", href: "/files", icon: HardDrive },
      { title: "Thanh toán & Quota", href: "/payment", icon: CreditCard },
      { title: "Cài đặt", href: "/settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center gap-2">
        <div className={cn("flex-1 min-w-0", state === "collapsed" && "hidden")}>
          <WorkspaceNav />
        </div>
        <SidebarTrigger
          className={cn(
            "h-6 w-6 shrink-0 rounded-md border bg-sidebar-accent hover:bg-sidebar-accent/80 shadow-sm",
            state === "collapsed" && "mx-auto"
          )}
        />
      </SidebarHeader>
      <SidebarContent
        className={cn(
          "gap-1 px-2 py-1",
          state === "collapsed" && "flex flex-col items-center gap-3 px-1 py-1"
        )}
      >
        {navGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            className={cn(
              "gap-0.5",
              state === "collapsed" && "w-full max-w-[2.75rem] p-0 flex flex-col items-center"
            )}
          >
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className={state === "collapsed" ? "w-full" : undefined}>
              <SidebarMenu
                className={cn(state === "collapsed" && "flex flex-col items-center gap-0.5")}
              >
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}
