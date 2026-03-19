"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { useI18n } from "./language-provider";

const localeNames: Record<string, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const { t, locale, setLocale } = useI18n();

  const locales = [
    { code: "vi" as const, label: t("language_vietnamese") },
    { code: "en" as const, label: t("language_english") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 min-w-[2.5rem] sm:min-w-0 border-gray-300 hover:bg-gray-100 h-9 px-3 ${className ?? ""}`}
        >
          <Globe className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">{localeNames[locale] || locale}</span>
          <span className="sm:hidden text-xs font-medium uppercase">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={locale === loc.code ? "bg-accent" : ""}
          >
            {localeNames[loc.code] || loc.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
