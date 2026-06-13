"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TableProperties, Sparkles, FolderKanban } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { WorkspaceNav } from "./workspace-nav"
import { UserNav } from "./user-nav"
import { cn } from "@/lib/utils"

const lpmsNavItems = [
  { title: "Tổng quan LPMS", href: "/lpms/dashboard", icon: LayoutDashboard },
  { title: "Bóc tách hàng loạt", href: "/lpms/tabular-analysis", icon: TableProperties },
  { title: "Trợ lý & Án lệ", href: "/lpms/assistant", icon: Sparkles },
  { title: "Vụ việc (Matters)", href: "/lpms/matters", icon: FolderKanban },
]

export function LPMSSidebar() {
  const pathname = usePathname()
  const { state, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="flex flex-row items-center gap-2">
        <div className={cn("flex-1 min-w-0", state === "collapsed" && "hidden")}>
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">Lawzy LPMS</span>
              <span className="text-xs text-muted-foreground leading-tight">AI Legal Assistant</span>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className={cn("gap-1 px-2 py-1", state === "collapsed" && "flex flex-col items-center gap-3 px-1")}>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {lpmsNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
