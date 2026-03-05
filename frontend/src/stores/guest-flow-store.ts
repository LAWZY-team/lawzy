import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type GuestEntry = "landing" | null

interface GuestFlowState {
  entry: GuestEntry
  startedAt: number | null

  startFromLanding: () => void
  clear: () => void
  markAuthenticated: () => void
}

export const useGuestFlowStore = create<GuestFlowState>()(
  persist(
    (set, get) => ({
      entry: null,
      startedAt: null,

      startFromLanding: () =>
        set({
          entry: "landing",
          startedAt: Date.now(),
        }),

      clear: () =>
        set({
          entry: null,
          startedAt: null,
        }),

      markAuthenticated: () => {
        // Clear guest flags once the user is authenticated (avoid stale guest UI)
        if (get().entry !== null) {
          set({ entry: null, startedAt: null })
        }
      },
    }),
    {
      name: "lawzy-guest-flow",
      storage: createJSONStorage(() => sessionStorage),
      // Avoid hydration mismatch in Next SSR/App Router:
      // hydrate manually after mount (see AuthBootstrap).
      skipHydration: true,
      version: 1,
    }
  )
)

