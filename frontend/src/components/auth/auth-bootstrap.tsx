"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore } from "@/stores/workspace-store"

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`))
}

export function AuthBootstrap() {
  const user = useAuthStore((s) => s.user)
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces)

  useEffect(() => {
    const { setUser, setAuthResolved, fetchUser } = useAuthStore.getState()

    if (!hasCookie("auth_session")) {
      setUser(null)
      setAuthResolved(true)
      return
    }

    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchWorkspaces()
    }
  }, [user, fetchWorkspaces])

  return null
}

