"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Hrefs of sidebar items that can be toggled (base nav only, not admin) */
export const SIDEBAR_ITEM_HREFS = [
  "/dashboard",
  "/documents",
  "/fields",
  "/templates",
  "/sources",
  "/files",
  "/payment",
  "/workspace",
  "/settings",
] as const

export type SidebarItemHref = (typeof SIDEBAR_ITEM_HREFS)[number]

const DEFAULT_VISIBLE: SidebarItemHref[] = [
  "/dashboard",
  "/documents",
  "/fields",
  "/templates",
  "/sources",
  "/files",
  "/payment",
  "/workspace",
  "/settings",
]

interface SidebarDisplayState {
  visibleHrefs: SidebarItemHref[]
  setVisibleHrefs: (hrefs: SidebarItemHref[]) => void
  isVisible: (href: string) => boolean
  resetToDefaults: () => void
}

export const useSidebarDisplayStore = create<SidebarDisplayState>()(
  persist(
    (set, get) => ({
      visibleHrefs: DEFAULT_VISIBLE,

      setVisibleHrefs: (hrefs) => set({ visibleHrefs: hrefs }),

      isVisible: (href) => (get().visibleHrefs as readonly string[]).includes(href),

      resetToDefaults: () => set({ visibleHrefs: [...DEFAULT_VISIBLE] }),
    }),
    { name: "lawzy-sidebar-display", version: 1 }
  )
)
