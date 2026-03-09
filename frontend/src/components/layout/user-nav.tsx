"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronsUpDown, LogOut, Settings, User, Globe, UserPlus } from "lucide-react"

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
import { useAuthStore } from "@/stores/auth-store"
import { useT } from "@/components/i18n-provider"
import { useGuestFlowStore } from "@/stores/guest-flow-store"
import useStore from "@/lib/zustand/use-store"

export function UserNav() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { t, locale, setLocale } = useT()

  const guestEntry = useStore(useGuestFlowStore, (s) => s.entry)
  const isAuthenticated = useStore(useAuthStore, (s) => s.isAuthenticated)
  const authResolved = useStore(useAuthStore, (s) => s.authResolved)

  // Treat as guest if we know they are not authenticated, or if unresolved but they came from landing.
  const isGuest = authResolved ? !isAuthenticated : (guestEntry === "landing")

  const displayName = isGuest ? "Khách" : (user?.name ?? "User")
  const displayEmail = isGuest ? "" : (user?.email ?? "")
  const initials = displayName.substring(0, 2).toUpperCase()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // proceed with client-side logout regardless
    }
    logout()
    router.push("/")
  }

  const toggleLocale = () => setLocale(locale === "vi" ? "en" : "vi")

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
                <AvatarImage src={user?.avatar ?? undefined} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{displayEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar ?? undefined} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isGuest ? (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <User className="mr-2 h-4 w-4" />
                    Đăng nhập
                  </Link>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile">
                    <User className="mr-2 h-4 w-4" />
                    {t("settings_account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    {t("settings_title")}
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem onClick={toggleLocale}>
              <Globe className="mr-2 h-4 w-4" />
              {locale === "vi" ? "English" : "Tiếng Việt"}
            </DropdownMenuItem>

            {!isGuest && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("auth_logout")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
