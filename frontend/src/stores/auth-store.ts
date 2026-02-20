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
  setUser: (user: User | null) => void
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        document.cookie = "auth_session=; path=/; max-age=0";
        set({ user: null, isAuthenticated: false });
      },
      fetchUser: async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const user = await res.json();
            if (user && !user.error) {
              set({ user, isAuthenticated: true });
              return;
            }
          }
          set({ user: null, isAuthenticated: false });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'lawzy-auth',
    }
  )
)
