"use client"

import { useEffect, useState, useRef } from "react"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useDashboardInitial } from "./use-dashboard"
import { useDashboardChart } from "./use-dashboard"
import type { DashboardPeriod } from "@/components/dashboard/overview-chart"

const MIN_SKELETON_MS = 200

export interface UseDashboardWorkspaceTransitionOptions {
  chartEnabled?: boolean
  period?: DashboardPeriod
}

export function useDashboardWorkspaceTransition(
  options: UseDashboardWorkspaceTransitionOptions = {}
) {
  const { chartEnabled = false, period = "year" } = options
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const prevWorkspaceId = useRef<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionStart = useRef<number | null>(null)

  const { isFetching: initialFetching } = useDashboardInitial(10)
  const { isFetching: chartFetching } = useDashboardChart(period, {
    enabled: chartEnabled,
  })

  const criticalFetching = initialFetching
  const chartFetchingRelevant = chartEnabled && chartFetching
  const allSettled = !criticalFetching && !chartFetchingRelevant

  useEffect(() => {
    const changed = prevWorkspaceId.current !== workspaceId
    prevWorkspaceId.current = workspaceId ?? null

    if (!changed || workspaceId == null) return

    const id = requestAnimationFrame(() => {
      setIsTransitioning(true)
      transitionStart.current = Date.now()
    })
    return () => cancelAnimationFrame(id)
  }, [workspaceId])

  useEffect(() => {
    if (!isTransitioning || transitionStart.current == null) return

    const elapsed = Date.now() - transitionStart.current
    const minElapsed = elapsed >= MIN_SKELETON_MS

    if (allSettled && minElapsed) {
      const id = requestAnimationFrame(() => {
        setIsTransitioning(false)
        transitionStart.current = null
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isTransitioning, allSettled])

  return isTransitioning
}
