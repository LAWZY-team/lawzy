"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { viMessages, enMessages, type Locale } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const dictionaries: Record<Locale, Record<string, string>> = {
  vi: viMessages,
  en: enMessages,
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LandingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lawzy_lang") as Locale | null;
      if (stored === "en" || stored === "vi") return stored;
      return navigator.language.startsWith("vi") ? "vi" : "en";
    }
    return "vi";
  });

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = dictionaries[locale][key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale]
  );

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lawzy_lang", next);
      document.cookie = `lawzy_lang=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LandingLanguageProvider");
  return ctx;
}
