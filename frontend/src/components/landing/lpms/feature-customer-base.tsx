"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { ChevronRight, ShieldCheck } from "lucide-react";

export function FeatureCustomerBase() {
  const { t, locale } = useI18n();

  const leads = [
    t("lpms_partner_f1_lead_1"),
    t("lpms_partner_f1_lead_2"),
    t("lpms_partner_f1_lead_3"),
    t("lpms_partner_f1_lead_4"),
    t("lpms_partner_f1_lead_5"),
    t("lpms_partner_f1_lead_6"),
  ];

  return (
    <LpmsFeatureShell
      index={2}
      title={t("lpms_partner_f1_title")}
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 mt-2">
        {/* Left Column: Text & Benefit (takes 7 columns on lg) */}
        <div className="space-y-6 lg:col-span-7 flex flex-col justify-center">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lpms_partner_f1_mechanism")}
          </p>
          <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-6 text-base leading-relaxed text-orange-950">
            <p className="font-semibold text-orange-800 mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-orange-600 shrink-0" />
              {locale === "vi" ? "Giá trị đối tác" : "Partner Value"}
            </p>
            <p className="text-orange-900/90 text-sm sm:text-base">{t("lpms_partner_f1_benefit")}</p>
          </div>
        </div>

        {/* Right Column: Lead Directory List (takes 5 columns on lg) */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t("lpms_partner_f1_route_label")}
            </h3>
            <div className="space-y-3">
              {leads.map((lead, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm text-foreground transition-all hover:border-emerald-100 hover:bg-emerald-50/10"
                >
                  <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground/90">{lead}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
