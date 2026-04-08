"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { viMessages, enMessages, type Locale } from "@/lib/i18n";

const dictionaries: Record<Locale, Record<string, string>> = {
  vi: viMessages,
  en: enMessages,
};

const LOCALE_COOKIE = "lawzy_lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistLocaleClient(next: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("lawzy_lang", next);
  document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function readLocaleFromDocumentCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)lawzy_lang=(en|vi)(?:\s|;|$)/);
  if (m?.[1] === "en" || m?.[1] === "vi") return m[1] as Locale;
  return null;
}

type I18nContextValue = {
  locale: Locale;
  /** Accepts string for flexibility when passing to child components */
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export type I18nProviderProps = {
  children: React.ReactNode;
  /** Must match server (cookie in root layout). Avoids hydration mismatch. */
  initialLocale?: Locale;
};

export function I18nProvider({
  children,
  initialLocale = "vi",
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const stored = localStorage.getItem("lawzy_lang") as Locale | null;
      if (stored === "en" || stored === "vi") {
        if (stored !== initialLocale) setLocaleState(stored);
        persistLocaleClient(stored);
        return;
      }
      const cookieLang = readLocaleFromDocumentCookie();
      if (cookieLang) {
        if (cookieLang !== initialLocale) setLocaleState(cookieLang);
        return;
      }
      const nav = navigator.language.startsWith("vi") ? "vi" : "en";
      if (nav !== initialLocale) {
        setLocaleState(nav);
        persistLocaleClient(nav);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [initialLocale]);

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
    persistLocaleClient(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx;
}
