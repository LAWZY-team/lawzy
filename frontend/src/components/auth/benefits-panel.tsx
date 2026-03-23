"use client";

import { FileCheck, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

const BENEFIT_KEYS = [
  { icon: Zap, titleKey: "auth_benefit_save_title" as const, descKey: "auth_benefit_save_desc" as const },
  { icon: FileCheck, titleKey: "auth_benefit_review_title" as const, descKey: "auth_benefit_review_desc" as const },
  { icon: Shield, titleKey: "auth_benefit_manage_title" as const, descKey: "auth_benefit_manage_desc" as const },
];

export function BenefitsPanel({ className }: { className?: string }) {
  const { t } = useT();

  return (
    <div className={cn("w-full space-y-6", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t("auth_benefits_why")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("auth_benefits_subtitle")}</p>
      </div>
      <div className="space-y-4">
        {BENEFIT_KEYS.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
