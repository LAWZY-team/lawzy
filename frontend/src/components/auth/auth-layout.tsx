"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export interface AuthLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, leftPanel, rightPanel, className }: AuthLayoutProps) {
  const { t, locale, setLocale } = useT();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-50 w-full flex-shrink-0 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-800 dark:bg-gray-950/95">
        <div className="container flex h-14 items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center" aria-label="Lawzy">
            <Image src="/lawzy-logo.png" alt="Lawzy" width={160} height={56} className="h-12 w-auto sm:h-14" priority />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                {locale === "vi" ? t("auth_lang_vi") : t("auth_lang_en")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("vi" as Locale)}>
                {t("auth_lang_vi")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en" as Locale)}>
                {t("auth_lang_en")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className={cn("flex flex-1 min-h-0 overflow-hidden", className)}>
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0">
          {leftPanel && (
            <div className="hidden lg:flex p-3 pb-3">
              <div className="flex flex-col justify-center w-full rounded-2xl bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-900/50 dark:to-gray-800/40 px-6 py-8">
                <div className="w-full max-w-[280px]">{leftPanel}</div>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-start overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md mx-auto flex flex-col justify-center min-h-0 py-4 sm:py-6">
              {children}
            </div>
          </div>

          {rightPanel && (
            <div className="hidden xl:flex flex-col justify-center p-6 border-l border-gray-100 dark:border-gray-800">
              <div className="w-full max-w-[280px]">{rightPanel}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
