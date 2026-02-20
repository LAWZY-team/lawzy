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
import { useT } from "@/components/i18n-provider"
import type { TranslationKey } from "@/lib/i18n"

type NavItem = { titleKey: TranslationKey; href: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { labelKey: TranslationKey; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    labelKey: "sidebar_workspaces",
    items: [
      { titleKey: "sidebar_dashboard", href: "/dashboard", icon: LayoutDashboard },
      { titleKey: "sidebar_documents", href: "/documents", icon: FileText },
      { titleKey: "sidebar_sources", href: "/sources", icon: FolderInput },
    ],
  },
  {
    labelKey: "sidebar_library",
    items: [
      { titleKey: "sidebar_templates", href: "/templates", icon: Library },
    ],
  },
  {
    labelKey: "sidebar_settings",
    items: [
      { titleKey: "sidebar_workspace", href: "/workspace", icon: Users },
      { titleKey: "sidebar_files", href: "/files", icon: HardDrive },
      { titleKey: "sidebar_payment", href: "/payment", icon: CreditCard },
      { titleKey: "sidebar_settings", href: "/settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { t } = useT()

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
            key={group.labelKey}
            className={cn(
              "gap-0.5",
              state === "collapsed" && "w-full max-w-[2.75rem] p-0 flex flex-col items-center"
            )}
          >
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent className={state === "collapsed" ? "w-full" : undefined}>
              <SidebarMenu
                className={cn(state === "collapsed" && "flex flex-col items-center gap-0.5")}
              >
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
                  return (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(item.titleKey)}</span>
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
