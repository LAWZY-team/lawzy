"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  DASHBOARD_GRID_STATS,
  DASHBOARD_GRID_QUOTA,
  DASHBOARD_GRID_CHART,
} from "./dashboard-card.styles"

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className={DASHBOARD_GRID_STATS}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className={DASHBOARD_GRID_QUOTA}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>

      <div className={DASHBOARD_GRID_CHART}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
