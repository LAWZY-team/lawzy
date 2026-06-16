"use client";

import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { Award } from "lucide-react";

export function FeatureJointMedia() {
  const { t, locale } = useI18n();

  return (
    <LpmsFeatureShell index={3} title={t("lpms_partner_f4_title")}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-14 mt-2">
        {/* Left: Content */}
        <div className="space-y-6 lg:col-span-7">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lpms_partner_f4_mechanism")}
          </p>
          <div className="rounded-3xl border border-orange-100 bg-orange-50/50 p-6 text-base leading-relaxed text-orange-950">
            <p className="font-semibold text-orange-850 mb-1 flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600 shrink-0" />
              {locale === "vi" ? "Giá trị truyền thông" : "Media Value"}
            </p>
            <p className="text-orange-900/95 text-sm sm:text-base">{t("lpms_partner_f4_benefit")}</p>
          </div>
        </div>

        {/* Right: Premium Trust Stamp Card */}
        <div className="lg:col-span-5 flex justify-center w-full">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Subtle decorative glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-500/10">
                <Award className="h-8 w-8" />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-orange-655 font-bold text-orange-600">
                  {t("lpms_partner_f4_partner_badge")}
                </p>
                <h4 className="text-xl font-bold text-foreground tracking-tight mt-1">
                  {t("lpms_partner_f4_partner_name")}
                </h4>
              </div>

              <div className="w-full border-t border-gray-100 my-2" />

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-mono tracking-wider">LAWYER SYNERGY NETWORK</p>
                <p>{locale === "vi" ? "Vinh danh đối tác chiến lược trên lawzy.vn" : "Strategic partner spotlight on lawzy.vn"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
