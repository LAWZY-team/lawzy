"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { TrendingUp, Cpu, GraduationCap } from "lucide-react";

export function FeatureProfessionalNetwork() {
  const { t, locale } = useI18n();

  const networkPartners = [
    {
      name: "Golden Gate Ventures",
      desc: t("lpms_partner_f5_tooltip_ggv"),
      icon: TrendingUp,
    },
    {
      name: "BLOCK71",
      desc: t("lpms_partner_f5_tooltip_block71"),
      icon: Cpu,
    },
    {
      name: locale === "vi" ? "Trường Đại học Luật" : "Law Universities",
      desc: t("lpms_partner_f5_tooltip_ulaw"),
      icon: GraduationCap,
    },
  ];

  return (
    <LpmsFeatureShell index={4} title={t("lpms_partner_f5_title")}>
      <div className="flex flex-col gap-6 lg:gap-8">
        {/* Intro text */}
        <div className="max-w-3xl space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lpms_partner_f5_mechanism")}
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 text-sm text-foreground sm:text-base">
            {t("lpms_partner_f5_benefit")}
          </p>
        </div>

        {/* 3-column Grid (unboxed) */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:gap-12 mt-4">
          {networkPartners.map((partner, i) => {
            const Icon = partner.icon;
            return (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground text-base">
                    {partner.name}
                  </h4>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {partner.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
