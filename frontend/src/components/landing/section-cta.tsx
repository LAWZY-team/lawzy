"use client";

import { Cta } from "./cta";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useI18n } from "./language-provider";
import { ROUTES } from "@/lib/routes";
import { ChevronRight } from "lucide-react";

export function SectionCta({ hint }: { hint?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
        <Cta href={ROUTES.login} label={t("try_free")} icon={ChevronRight} variant="primary" className="sm:min-w-[13.5rem]" />
        <Button size="lg" className="w-full sm:w-auto shadow-md shadow-orange-900/10" asChild>
          <Link href="/contact">
            {t("contact_sales")}
          </Link>
        </Button>
      </div>
      {hint ? <p className="text-center text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
