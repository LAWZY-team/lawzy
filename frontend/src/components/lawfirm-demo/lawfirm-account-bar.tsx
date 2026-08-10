"use client";

import React from "react";
import { Languages, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { redirectAfterLogout } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";
import { UsageGuideDialog } from "./usage-guide-dialog";
import type { Locale } from "./lawfirm-demo-types";

const copy = {
  vi: {
    guestName: "Khách hàng LAWZY",
    guestEmail: "guest@lawzy.vn",
    logout: "Đăng xuất",
  },
  en: {
    guestName: "LAWZY Guest",
    guestEmail: "guest@lawzy.vn",
    logout: "Sign out",
  },
} as const;

export function LawfirmAccountBar({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange?: (nextLocale: Locale) => void;
}) {
  const t = copy[locale];
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const displayName = user?.name || t.guestName;
  const displayEmail = user?.email || t.guestEmail;
  const initial = displayName.charAt(0).toUpperCase();

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
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-md border border-zinc-200 bg-white p-2 text-left transition hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-950">{displayName}</p>
              <p className="truncate text-[10px] text-zinc-500">{displayEmail}</p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={6}
          className="w-[176px] space-y-1.5 p-1.5 shadow-md border-zinc-200 bg-white"
        >
          {onLocaleChange && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onLocaleChange(locale === "vi" ? "en" : "vi")}
              className="w-full justify-start gap-2 border-zinc-300 bg-white text-xs font-medium text-zinc-950 hover:bg-zinc-50"
            >
              <Languages className="size-4 text-zinc-700" />
              <span>{locale === "vi" ? "English" : "Tiếng Việt"}</span>
            </Button>
          )}

          <UsageGuideDialog locale={locale} />

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="size-4" />
            <span>{t.logout}</span>
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
