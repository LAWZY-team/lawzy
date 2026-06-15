"use client";

import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authResolved = useAuthStore((s) => s.authResolved);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    isAuthenticated,
    authLoading: !authResolved,
    signOut: logout,
  };
}
