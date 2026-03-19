"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useGuestFlowStore } from "@/stores/guest-flow-store"

function hasCookie(name: string): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").some((c) => c.startsWith(`${name}=`))
}

/**
 * Bootstraps auth state on the client to reliably distinguish guest vs logged-in.
 * Also rehydrates guest-flow store (skipHydration) and clears it once authenticated.
 */
export function AuthBootstrap() {
  useEffect(() => {
    // Zustand persist stores with skipHydration need explicit hydration after mount.
    useGuestFlowStore.persist.rehydrate()

    const { setUser, setAuthResolved, fetchUser } = useAuthStore.getState()

    // Logged-in requires both: cookie present + /api/auth/me returns user.
    if (!hasCookie("auth_session")) {
      setUser(null)
      setAuthResolved(true)
      return
    }

    fetchUser().finally(() => {
      const { isAuthenticated } = useAuthStore.getState()
      if (isAuthenticated) {
        useGuestFlowStore.getState().markAuthenticated()
      }
    })
  }, [])

  return null
}

