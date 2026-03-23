"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LifeBuoy, Lock } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { WorkspaceNav } from "./workspace-nav"
import { UserNav } from "./user-nav"
import { HelpCenterPopover } from "@/components/help/help-widget"
import { baseNavGroups, adminNavGroup } from "./sidebar-data"
import type { NavCollapsible, NavGroup, NavLink } from "./sidebar-data"
import { cn } from "@/lib/utils"
import { useT } from "@/components/i18n-provider"
import { useAuthStore } from "@/stores/auth-store"
import { useSidebarDisplayStore } from "@/stores/sidebar-display-store"

function isNavLink(item: NavLink | NavCollapsible): item is NavLink {
  return "href" in item && !("items" in item)
}

function checkIsActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"))
}

function checkCollapsibleActive(pathname: string, item: NavCollapsible): boolean {
  return item.items.some((sub) => checkIsActive(pathname, sub.href))
}

function SidebarMenuLink({ item, pathname, t }: {
  item: NavLink
  pathname: string
  t: (k: string) => string
}) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(pathname, item.href)
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.titleKey)}>
        <Link href={item.href} onClick={() => setOpenMobile(false)} id={`sidebar-${item.href.replace(/\//g, "-") || "home"}`}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(item.titleKey)}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  pathname,
  t,
}: {
  item: NavCollapsible
  pathname: string
  t: (k: string) => string
}) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isActive = checkCollapsibleActive(pathname, item)
  const Icon = item.icon
  const defaultOpen = isActive

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={t(item.titleKey)} isActive={isActive}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.titleKey)}</span>
              <ChevronRight className="ms-auto size-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={4}>
            <DropdownMenuLabel>{t(item.titleKey)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {item.items.map((sub) => {
              const SubIcon = sub.icon
              return (
                <DropdownMenuItem key={sub.href} asChild>
                  <Link
                    href={sub.href}
                    className={checkIsActive(pathname, sub.href) ? "bg-accent" : ""}
                    onClick={() => setOpenMobile(false)}
                  >
                    {SubIcon && <SubIcon className="size-4 shrink-0" />}
                    <span>{t(sub.titleKey)}</span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={t(item.titleKey)} isActive={isActive}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(item.titleKey)}</span>
            <ChevronRight className="ms-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((sub) => {
              const SubIcon = sub.icon
              return (
                <SidebarMenuSubItem key={sub.href}>
                  <SidebarMenuSubButton asChild isActive={checkIsActive(pathname, sub.href)}>
                    <Link href={sub.href} onClick={() => setOpenMobile(false)}>
                      {SubIcon && <SubIcon className="size-4 shrink-0" />}
                      <span>{t(sub.titleKey)}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function NavGroup({ group, pathname, t, state }: {
  group: NavGroup
  pathname: string
  t: (k: string) => string
  state: "expanded" | "collapsed"
}) {
  return (
    <SidebarGroup
      key={group.labelKey}
      className={cn(
        "gap-0.5",
        state === "collapsed" && "w-full max-w-11 p-0 flex flex-col items-center"
      )}
    >
      <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
        {group.locked && <Lock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />}
        {t(group.labelKey)}
      </SidebarGroupLabel>
      <SidebarGroupContent className={state === "collapsed" ? "w-full" : undefined}>
        <SidebarMenu
          className={cn(state === "collapsed" && "flex flex-col items-center gap-0.5")}
        >
          {group.items.map((item) => {
            if (isNavLink(item)) {
              return (
                <SidebarMenuLink
                  key={item.titleKey}
                  item={item}
                  pathname={pathname}
                  t={t}
                />
              )
            }
            return (
              <SidebarMenuCollapsible
                key={item.titleKey}
                item={item}
                pathname={pathname}
                t={t}
              />
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function filterBaseGroupByVisibleHrefs(
  group: NavGroup,
  isVisible: (href: string) => boolean
): NavGroup {
  const filtered = group.items.filter((item) => {
    if (isNavLink(item)) return isVisible(item.href)
    return true
  })
  return { ...group, items: filtered }
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const isVisible = useSidebarDisplayStore((s) => s.isVisible)
  const isAdmin = user?.roles?.some((r) => r.toLowerCase() === "admin") ?? false
  const navGroups = React.useMemo(() => {
    const baseFiltered = baseNavGroups.map((g) =>
      filterBaseGroupByVisibleHrefs(g, (href) => isVisible(href))
    )
    const baseCleaned = baseFiltered.filter((g) => g.items.length > 0)
    const withAdmin = isAdmin ? [...baseCleaned, adminNavGroup] : baseCleaned
    return withAdmin
  }, [isAdmin, isVisible])

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
          <NavGroup
            key={group.labelKey}
            group={group}
            pathname={pathname}
            t={t}
            state={state}
          />
        ))}
      </SidebarContent>
      <SidebarFooter id="sidebar-user-nav">
        <SidebarMenu>
          <SidebarMenuItem>
            <HelpCenterPopover>
              <SidebarMenuButton
                tooltip={t("sidebar_help_center")}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <LifeBuoy className={cn("h-4 w-4 shrink-0", state === "collapsed" && "mx-auto")} />
                <span className={cn("truncate", state === "collapsed" && "hidden")}>
                  {t("sidebar_help_center")}
                </span>
              </SidebarMenuButton>
            </HelpCenterPopover>
          </SidebarMenuItem>
        </SidebarMenu>
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
