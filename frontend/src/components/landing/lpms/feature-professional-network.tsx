"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";

export function FeatureProfessionalNetwork() {
  const { t } = useI18n();

  return (
    <LpmsFeatureShell index={4} badge={t("lpms_partner_f5_badge")} title={t("lpms_partner_f5_title")}>
      <div className="max-w-3xl space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
        <p>{t("lpms_partner_f5_mechanism")}</p>
        <p className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-foreground">{t("lpms_partner_f5_benefit")}</p>
      </div>
    </LpmsFeatureShell>
  );
}
