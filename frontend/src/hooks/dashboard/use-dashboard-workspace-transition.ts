"use client"

import { useEffect, useState, useRef } from "react"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useDashboardOverview } from "./use-dashboard"
import { useRecentDocuments } from "./use-dashboard"

const MIN_SKELETON_MS = 350

export function useDashboardWorkspaceTransition() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const prevWorkspaceId = useRef<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionStart = useRef<number | null>(null)

  const { isFetching: overviewFetching } = useDashboardOverview()
  const { isFetching: recentFetching } = useRecentDocuments()

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
    const settled = !overviewFetching && !recentFetching
    const minElapsed = elapsed >= MIN_SKELETON_MS

    if (settled && minElapsed) {
      const id = requestAnimationFrame(() => {
        setIsTransitioning(false)
        transitionStart.current = null
      })
      return () => cancelAnimationFrame(id)
    }
  }, [isTransitioning, overviewFetching, recentFetching])

  return isTransitioning
}
