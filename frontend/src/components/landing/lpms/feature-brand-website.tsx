"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone } from "lucide-react";

export function FeatureBrandWebsite() {
  const { t } = useI18n();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <LpmsFeatureShell index={1} badge={t("lpms_partner_f3_badge")} title={t("lpms_partner_f3_title")}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p>{t("lpms_partner_f3_design")}</p>
          <p>{t("lpms_partner_f3_onboarding")}</p>
          <p className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm sm:text-base">{t("lpms_partner_f3_support")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                device === "desktop" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              <Monitor className="h-4 w-4" />
              {t("lpms_partner_f3_device_desktop")}
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                device === "mobile" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              <Smartphone className="h-4 w-4" />
              {t("lpms_partner_f3_device_mobile")}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <motion.div
            layout
            className={cn(
              "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transition-all duration-500",
              device === "desktop" ? "w-full max-w-lg" : "w-[280px]"
            )}
          >
            <div className="border-b border-gray-100 bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white">
              {t("lpms_partner_f4_partner_name")}
            </div>
            <div className={cn("space-y-3 p-4", device === "mobile" && "p-3")}>
              <div className="h-16 rounded-lg bg-gradient-to-r from-orange-100 to-orange-50" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          </motion.div>
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Onboarding Widget</p>
            <div className="space-y-2">
              <input readOnly placeholder={t("lpms_partner_f3_form_name")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input readOnly placeholder={t("lpms_partner_f3_form_phone")} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <textarea readOnly placeholder={t("lpms_partner_f3_form_issue")} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <button
                type="button"
                className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(234,88,12,0.6)] transition-shadow hover:shadow-[0_0_32px_-2px_rgba(234,88,12,0.75)]"
              >
                {t("lpms_partner_f3_form_submit")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
