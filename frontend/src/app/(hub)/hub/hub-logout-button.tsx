"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function HubLogoutButton() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    logout();
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      Đăng xuất
    </button>
  );
}
