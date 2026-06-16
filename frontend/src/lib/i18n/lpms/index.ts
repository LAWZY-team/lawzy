export { lpmsVi, type LpmsTranslationKey } from "./vi";
export { lpmsEn } from "./en";

import type { Locale } from "@/lib/i18n";
import { enUS, vi } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

export const getLpmsDateFnsLocale = (locale: Locale): DateFnsLocale =>
  locale === "vi" ? vi : enUS;
