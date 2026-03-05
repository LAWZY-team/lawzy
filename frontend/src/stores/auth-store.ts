import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  roles: string[]
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  /**
   * True once we've determined the auth state for the current tab/session.
   * Prevents UI flicker (e.g. showing settings sidebar briefly) while auth is unknown.
   */
  authResolved: boolean
  setUser: (user: User | null) => void
  setAuthResolved: (resolved: boolean) => void
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      authResolved: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthResolved: (resolved) => set({ authResolved: resolved }),
      logout: () => {
        document.cookie = "auth_session=; path=/; max-age=0";
        set({ user: null, isAuthenticated: false, authResolved: true });
      },
      fetchUser: async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const user = await res.json();
            if (user && !user.error) {
              set({ user, isAuthenticated: true, authResolved: true });
              return;
            }
          }
          set({ user: null, isAuthenticated: false, authResolved: true });
        } catch {
          set({ user: null, isAuthenticated: false, authResolved: true });
        }
      },
    }),
    {
      name: 'lawzy-auth',
    }
  )
)
