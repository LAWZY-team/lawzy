"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

/** Card IDs that can be shown/hidden on the dashboard */
export const DASHBOARD_CARD_IDS = [
  "total_docs",
  "completed",
  "drafting",
  "total_files",
  "ai_quota",
  "storage",
  "referral",
  "chart",
  "workspace_breakdown",
  "recent_docs",
] as const

export type DashboardCardId = (typeof DASHBOARD_CARD_IDS)[number]

const DEFAULT_ENABLED: DashboardCardId[] = [
  "total_docs",
  "completed",
  "drafting",
  "total_files",
  "ai_quota",
  "storage",
  "referral",
  "chart",
  "workspace_breakdown",
  "recent_docs",
]

interface DashboardDisplayState {
  enabledCards: DashboardCardId[]
  setEnabledCards: (cards: DashboardCardId[]) => void
  toggleCard: (id: DashboardCardId) => void
  isCardEnabled: (id: DashboardCardId) => boolean
  resetToDefaults: () => void
}

export const useDashboardDisplayStore = create<DashboardDisplayState>()(
  persist(
    (set, get) => ({
      enabledCards: DEFAULT_ENABLED,

      setEnabledCards: (cards) => set({ enabledCards: cards }),

      toggleCard: (id) => {
        const current = get().enabledCards
        const next = current.includes(id)
          ? current.filter((c) => c !== id)
          : [...current, id]
        set({ enabledCards: next })
      },

      isCardEnabled: (id) => get().enabledCards.includes(id),

      resetToDefaults: () => set({ enabledCards: [...DEFAULT_ENABLED] }),
    }),
    {
      name: "lawzy-dashboard-display",
      version: 1,
    }
  )
)
