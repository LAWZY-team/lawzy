import { create } from "zustand";
import { useGuestEditorSessionStore } from "./guest-editor-session-store";
import { useWorkspaceStore } from "./workspace-store";
import { clearAuthCookie } from "@/lib/auth";

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  authResolved: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthResolved: (resolved) => set({ authResolved: resolved }),
  logout: () => {
    clearAuthCookie();
    set({ user: null, isAuthenticated: false, authResolved: true });

    if (typeof window !== "undefined") {
      (window as { __isLoggingOut?: boolean }).__isLoggingOut = true;
      setTimeout(
        () => ((window as { __isLoggingOut?: boolean }).__isLoggingOut = false),
        2000
      );
    }

    useGuestEditorSessionStore.getState().clearSession();
    useWorkspaceStore.getState().setLoginScopedWorkspaceId(null);
    try {
      sessionStorage.removeItem("lawzy-guest-editor-session");
    } catch {
      /**/
    }
  },
  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        if (user && !user.error) {
          set({ user, isAuthenticated: true, authResolved: true });
          return;
        }
      }
      if (res.status === 401) clearAuthCookie();
      set({ user: null, isAuthenticated: false, authResolved: true });
    } catch {
      set({ user: null, isAuthenticated: false, authResolved: true });
    }
  },
}))
