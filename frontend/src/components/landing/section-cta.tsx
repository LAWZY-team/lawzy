"use client";

import { Cta } from "./cta";
import { useContactModal } from "./contact-modal";
import { useI18n } from "./language-provider";
import { ROUTES } from "@/lib/routes";
import { ChevronRight, Calendar } from "lucide-react";

export function SectionCta({ hint }: { hint?: string }) {
  const { t } = useI18n();
  const { open } = useContactModal();
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        <Cta href={ROUTES.login} label={t("try_free")} icon={ChevronRight} variant="primary" className="sm:min-w-[13.5rem]" />
        <Cta label={t("contact_sales")} icon={Calendar} variant="secondary" onClick={open} className="sm:min-w-[12rem]" />
      </div>
      {hint ? <p className="text-center text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
