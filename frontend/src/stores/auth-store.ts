import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  roles: string[]
  position?: string | null
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

import { useGuestEditorSessionStore } from './guest-editor-session-store'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  authResolved: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthResolved: (resolved) => set({ authResolved: resolved }),
  logout: () => {
    document.cookie = "auth_session=; path=/; max-age=0";
    set({ user: null, isAuthenticated: false, authResolved: true });
    
    // Set flag to forcefully block any 'save on unmount' operations in editor 
    if (typeof window !== 'undefined') {
      ;(window as any).__isLoggingOut = true;
      setTimeout(() => {
        ;(window as any).__isLoggingOut = false;
      }, 2000);
    }

    // Dọn dẹp session guest draft tránh mồ côi
    useGuestEditorSessionStore.getState().clearSession();
    try {
      sessionStorage.removeItem('lawzy-guest-editor-session');
    } catch {
      // ignore
    }
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
}))
