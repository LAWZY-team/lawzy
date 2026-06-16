"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { Globe, UserPlus, ShieldCheck } from "lucide-react";

export function FeatureBrandWebsite() {
  const { t } = useI18n();

  const cards = [
    {
      icon: Globe,
      text: t("lpms_partner_f3_design"),
    },
    {
      icon: UserPlus,
      text: t("lpms_partner_f3_onboarding"),
    },
    {
      icon: ShieldCheck,
      text: t("lpms_partner_f3_support"),
    },
  ];

  return (
    <LpmsFeatureShell index={1} badge={t("lpms_partner_f3_badge")} title={t("lpms_partner_f3_title")}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8 mt-2">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="group relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100/80">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </LpmsFeatureShell>
  );
}
