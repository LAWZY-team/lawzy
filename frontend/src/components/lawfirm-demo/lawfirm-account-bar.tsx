"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { redirectAfterLogout } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";
import type { Locale } from "./lawfirm-demo-types";

const copy = {
  vi: {
    logout: "Đăng xuất",
  },
  en: {
    logout: "Sign out",
  },
} as const;

export function LawfirmAccountBar({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const logout = useAuthStore((s) => s.logout);
  // Intentionally do not display workspace name in the lawfirm demo.

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* proceed */
    }
    logout();
    redirectAfterLogout();
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50"
          >
            <User className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 size-4" />
            {t.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
