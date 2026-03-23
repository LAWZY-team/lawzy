"use client"

import { FileText, FileCheck, FileEdit, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard"
import { useT } from "@/components/i18n-provider"
import type { DashboardCardId } from "@/stores/dashboard-display-store"
import {
  DASHBOARD_CARD_HOVER,
  DASHBOARD_GRID_STATS,
  DASHBOARD_CARD_ANIMATION,
  DASHBOARD_CARD_STAGGER_MS,
} from "./dashboard-card.styles"

const CARD_MAP: Record<
  "total_docs" | "completed" | "drafting" | "total_files",
  {
    titleKey: string
    subKey: string
    valueKey: "totalDocuments" | "completedDocuments" | "draftDocuments" | "totalFiles"
    icon: typeof FileText
  }
> = {
  total_docs: {
    titleKey: "dash_total_docs",
    subKey: "dash_contracts_in_ws",
    valueKey: "totalDocuments",
    icon: FileText,
  },
  completed: {
    titleKey: "dash_completed",
    subKey: "dash_effective_docs",
    valueKey: "completedDocuments",
    icon: FileCheck,
  },
  drafting: {
    titleKey: "dash_drafting",
    subKey: "dash_drafts",
    valueKey: "draftDocuments",
    icon: FileEdit,
  },
  total_files: {
    titleKey: "dash_total_files",
    subKey: "dash_uploaded_files",
    valueKey: "totalFiles",
    icon: TrendingUp,
  },
}

const STAT_CARD_IDS = ["total_docs", "completed", "drafting", "total_files"] as const

export function StatsCards({
  showCards,
}: {
  /** If provided, only these cards are rendered. Otherwise all. */
  showCards?: DashboardCardId[]
}) {
  const { data, isLoading } = useDashboardOverview()
  const { t } = useT()

  const visibleIds = showCards
    ? STAT_CARD_IDS.filter((id) => showCards.includes(id))
    : STAT_CARD_IDS

  const cards = visibleIds.map((id) => {
    const config = CARD_MAP[id]
    const value = data?.[config.valueKey] ?? 0
    return {
      id,
      title: t(config.titleKey),
      value: typeof value === "number" ? value : 0,
      sub: t(config.subKey),
      icon: config.icon,
    }
  })

  if (cards.length === 0) return null

  return (
    <div className={DASHBOARD_GRID_STATS}>
      {cards.map((item, i) => (
        <Card
          key={item.id}
          className={`${DASHBOARD_CARD_ANIMATION} ${DASHBOARD_CARD_HOVER}`}
          style={
            { animationDelay: `${i * DASHBOARD_CARD_STAGGER_MS}ms` } as React.CSSProperties
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{item.value}</div>
            )}
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
