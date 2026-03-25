"use client"

import {
  LayoutDashboard,
  FileText,
  Library,
  FileEdit,
  Users,
  Inbox,
  HardDrive,
  CreditCard,
  Package,
  Building2,
  Settings,
  ClipboardList,
  FolderInput,
  Mail,
} from "lucide-react"
import type { TranslationKey } from "@/lib/i18n"

/** Flat nav item - single link */
export type NavLink = {
  titleKey: TranslationKey
  href: string
  icon: React.ComponentType<{ className?: string }>
  items?: never
}

/** Collapsible nav item - has sub-items */
export type NavCollapsible = {
  titleKey: TranslationKey
  icon: React.ComponentType<{ className?: string }>
  items: { titleKey: TranslationKey; href: string; icon?: React.ComponentType<{ className?: string }> }[]
  href?: never
}

export type NavItem = NavLink | NavCollapsible

export type NavGroup = {
  labelKey: TranslationKey
  items: NavItem[]
  /** Optional: show lock icon (e.g. for admin) */
  locked?: boolean
}

/** User dashboard nav - Không gian làm việc + Quản lý */
const baseNavGroups: NavGroup[] = [
  {
    labelKey: "sidebar_workspaces",
    items: [
      { titleKey: "sidebar_dashboard", href: "/dashboard", icon: LayoutDashboard },
      { titleKey: "sidebar_documents", href: "/documents", icon: FileText },
      { titleKey: "sidebar_profile", href: "/fields", icon: ClipboardList },
      { titleKey: "sidebar_templates", href: "/templates", icon: Library },
      { titleKey: "sidebar_sources", href: "/sources", icon: FolderInput },
    ],
  },
  {
    labelKey: "sidebar_management",
    items: [
      { titleKey: "sidebar_storage", href: "/usage", icon: HardDrive },
      { titleKey: "sidebar_payment_short", href: "/payment", icon: CreditCard },
      { titleKey: "sidebar_workspace", href: "/workspace", icon: Building2 },
      { titleKey: "sidebar_settings", href: "/settings", icon: Settings },
    ],
  },
]

/** Admin nav - CRM/CMS style. Users managed via Workspaces (members per workspace) */
export const adminNavGroup: NavGroup = {
  labelKey: "sidebar_admin",
  locked: true,
  items: [
    {
      titleKey: "sidebar_admin_relations",
      icon: Users,
      items: [
        { titleKey: "sidebar_admin_inbox", href: "/admin/inbox", icon: Inbox },
        { titleKey: "sidebar_admin_workspaces", href: "/admin/workspaces", icon: Building2 },
      ],
    },
    {
      titleKey: "sidebar_admin_content",
      icon: FileEdit,
      items: [
        { titleKey: "sidebar_admin_articles", href: "/admin/articles", icon: FileEdit },
        { titleKey: "sidebar_admin_email", href: "/admin/email-templates", icon: Mail },
      ],
    },
    {
      titleKey: "sidebar_admin_system",
      icon: Package,
      items: [
        { titleKey: "sidebar_admin_plans", href: "/admin/plans", icon: Package },
        { titleKey: "sidebar_admin_storage", href: "/admin/storage", icon: HardDrive },
      ],
    },
  ],
}

export { baseNavGroups }
