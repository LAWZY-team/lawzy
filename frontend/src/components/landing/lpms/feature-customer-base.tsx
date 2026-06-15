"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";
import { cn } from "@/lib/utils";
import { ArrowRight, Building2 } from "lucide-react";

const LEAD_KEYS = [
  "lpms_partner_f1_lead_1",
  "lpms_partner_f1_lead_2",
  "lpms_partner_f1_lead_3",
  "lpms_partner_f1_lead_4",
  "lpms_partner_f1_lead_5",
  "lpms_partner_f1_lead_6",
] as const;

const VISIBLE_LEAD_COUNT = 3;
const LEAD_ROTATE_MS = 2400;

export function FeatureCustomerBase() {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: tickerRef, inView: isTickerInView } = useInView({ threshold: 0.35 });
  const leads = LEAD_KEYS.map((key) => t(key));

  useEffect(() => {
    if (!isTickerInView) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % leads.length);
    }, LEAD_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isTickerInView, leads.length]);

  const visibleLeads = Array.from({ length: VISIBLE_LEAD_COUNT }, (_, offset) => {
    return leads[(activeIndex + offset) % leads.length];
  });

  return (
    <LpmsFeatureShell
      index={2}
      badge={t("lpms_partner_f1_badge")}
      title={t("lpms_partner_f1_title")}
      className="overflow-clip pb-16 [clip-path:inset(0)] sm:pb-20"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-5">
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{t("lpms_partner_f1_mechanism")}</p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5 text-sm leading-relaxed text-orange-950 sm:text-base">
            {t("lpms_partner_f1_benefit")}
          </p>
        </div>
        <div
          className="group relative overflow-clip rounded-3xl border border-gray-200/80 bg-gradient-to-br from-zinc-50 to-white p-6 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">LAWZY</span>
            </div>
            <ArrowRight className={cn("h-5 w-5 text-orange-500 transition-transform", hovered && "translate-x-1")} />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">{t("lpms_partner_f4_partner_name")}</span>
            </div>
          </div>
          <svg viewBox="0 0 300 32" className="pointer-events-none mb-2 h-8 w-full" aria-hidden preserveAspectRatio="none">
            <path
              d="M 24 16 Q 150 2 276 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              className={cn("text-orange-400 transition-opacity", hovered ? "lpms-route-line opacity-100" : "opacity-0")}
            />
          </svg>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("lpms_partner_f1_route_label")}</p>
          <div
            ref={tickerRef}
            className="relative h-[220px] overflow-clip rounded-2xl border border-gray-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="flex h-full flex-col gap-3">
              {visibleLeads.map((lead, idx) => (
                <div
                  key={`${lead}-${activeIndex}-${idx}`}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium transition-opacity duration-500",
                    idx === 0
                      ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 shadow-[0_0_20px_-4px_rgba(16,185,129,0.55)]"
                      : "border-gray-100 bg-gray-50/80 text-foreground dark:border-zinc-700 dark:bg-zinc-800/60"
                  )}
                >
                  {lead}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LpmsFeatureShell>
  );
}
