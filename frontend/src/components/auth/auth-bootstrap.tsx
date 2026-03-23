"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { hasAuthCookieClient, clearAuthCookie, loginPathWithReturn } from "@/lib/auth";

export function AuthBootstrap() {
  const user = useAuthStore((s) => s.user);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);
  const mounted = useRef(true);

  useEffect(() => {
    const { setUser, setAuthResolved, fetchUser } = useAuthStore.getState();

    if (!hasAuthCookieClient()) {
      setUser(null);
      setAuthResolved(true);
      return;
    }

    fetchUser().then(() => {
      if (!mounted.current || typeof window === "undefined") return;
      const { user: u, authResolved } = useAuthStore.getState();
      if (!authResolved || u) return;

      clearAuthCookie();
      window.location.replace(loginPathWithReturn(window.location.pathname));
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (user) fetchWorkspaces();
  }, [user, fetchWorkspaces]);

  return null;
}
