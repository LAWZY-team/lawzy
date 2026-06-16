import { useT } from "@/components/i18n-provider";
import type { LpmsTranslationKey } from "@/lib/i18n/lpms";

export const useLpmsT = () => {
  const { t: translate, locale, setLocale } = useT();
  const t = (
    key: LpmsTranslationKey,
    params?: Record<string, string | number>,
  ): string => translate(key, params);
  return { t, locale, setLocale };
};
