"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";

type PlanId = "showcase" | "admin" | "professional";

type FeatureRow = {
  labelKey: string;
  availability: [boolean, boolean, boolean];
};

type FeatureGroup = {
  titleKey: string;
  rows: FeatureRow[];
};

const PLAN_ORDER: PlanId[] = ["showcase", "admin", "professional"];

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    titleKey: "lpms_web_pricing_group_brand",
    rows: [
      {
        labelKey: "lpms_web_pricing_f_brand_identity",
        availability: [true, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_responsive",
        availability: [true, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_bilingual",
        availability: [true, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_contact_form",
        availability: [false, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_chatbot",
        availability: [false, true, true],
      },
    ],
  },
  {
    titleKey: "lpms_web_pricing_group_cms",
    rows: [
      {
        labelKey: "lpms_web_pricing_f_admin",
        availability: [false, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_posts",
        availability: [false, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_banner",
        availability: [false, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_careers",
        availability: [false, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_team",
        availability: [false, true, true],
      },
    ],
  },
  {
    titleKey: "lpms_web_pricing_group_seo",
    rows: [
      {
        labelKey: "lpms_web_pricing_f_seo",
        availability: [true, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_traffic",
        availability: [false, false, true],
      },
      {
        labelKey: "lpms_web_pricing_f_stats",
        availability: [false, false, true],
      },
    ],
  },
  {
    titleKey: "lpms_web_pricing_group_security",
    rows: [
      {
        labelKey: "lpms_web_pricing_f_https",
        availability: [true, true, true],
      },
      {
        labelKey: "lpms_web_pricing_f_antispam",
        availability: [false, false, true],
      },
      {
        labelKey: "lpms_web_pricing_f_protect",
        availability: [false, false, true],
      },
    ],
  },
];

const ADDONS = [
  {
    nameKey: "lpms_web_pricing_addon_newsletter_name",
    descKey: "lpms_web_pricing_addon_newsletter_desc",
    priceKey: "lpms_web_pricing_addon_newsletter_price",
  },
  {
    nameKey: "lpms_web_pricing_addon_brandkit_name",
    descKey: "lpms_web_pricing_addon_brandkit_desc",
    priceKey: "lpms_web_pricing_addon_brandkit_price",
  },
  {
    nameKey: "lpms_web_pricing_addon_blog_name",
    descKey: "lpms_web_pricing_addon_blog_desc",
    priceKey: "lpms_web_pricing_addon_blog_price",
  },
] as const;

const PROCESS_STEPS = [
  "lpms_web_pricing_step_1",
  "lpms_web_pricing_step_2",
  "lpms_web_pricing_step_3",
  "lpms_web_pricing_step_4",
  "lpms_web_pricing_step_5",
] as const;

const PLAN_META: Record<
  PlanId,
  { nameKey: string; priceKey: string; highlight?: boolean }
> = {
  showcase: {
    nameKey: "lpms_web_pricing_plan_showcase",
    priceKey: "lpms_web_pricing_plan_showcase_price",
  },
  admin: {
    nameKey: "lpms_web_pricing_plan_admin",
    priceKey: "lpms_web_pricing_plan_admin_price",
  },
  professional: {
    nameKey: "lpms_web_pricing_plan_professional",
    priceKey: "lpms_web_pricing_plan_professional_price",
  },
};

function AvailabilityCell({
  available,
  includedLabel,
  excludedLabel,
}: {
  available: boolean;
  includedLabel: string;
  excludedLabel: string;
}) {
  if (available) {
    return (
      <span className="inline-flex items-center justify-center text-orange-600" aria-label={includedLabel}>
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center text-muted-foreground/40" aria-label={excludedLabel}>
      <Minus className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

export function FeatureWebsitePricing() {
  const { t } = useI18n();
  const [activePlan, setActivePlan] = useState<PlanId>("admin");
  const activePlanIndex = PLAN_ORDER.indexOf(activePlan);
  const currentPlanMeta = PLAN_META[activePlan];

  return (
    <LpmsFeatureShell index={2} title={t("lpms_web_pricing_title")}>
      <p className="mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mb-10 sm:text-lg">
        {t("lpms_web_pricing_subtitle")}
      </p>

      {/* --- GIAO DIỆN MOBILE (md:hidden) --- */}
      <div className="block md:hidden">
        {/* Tab chuyển đổi giữa các gói */}
        <div className="mb-6 flex rounded-2xl border border-gray-200/80 bg-gray-100/80 p-1.5 shadow-inner">
          {PLAN_ORDER.map((planId) => {
            const isActive = activePlan === planId;
            return (
              <button
                key={planId}
                type="button"
                onClick={() => setActivePlan(planId)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-center text-xs font-semibold transition-colors sm:text-sm",
                  isActive
                    ? "bg-white text-orange-950 shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center justify-center gap-1">
                  {planId === "showcase" && "Showcase"}
                  {planId === "admin" && "Admin"}
                  {planId === "professional" && "Professional"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thẻ tóm tắt gói đang chọn */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {t(currentPlanMeta.nameKey)}
                </h3>
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t(currentPlanMeta.priceKey)}
              </p>
            </div>
          </div>

          <Button
            size="default"
            className="mt-5 w-full bg-orange-600 font-semibold text-white shadow-sm hover:bg-orange-700"
            asChild
          >
            <Link href="/contact">{t("lpms_web_pricing_cta")}</Link>
          </Button>
        </div>

        {/* Danh sách tính năng theo từng nhóm cho gói đang active */}
        <div className="mt-6 space-y-4">
          {FEATURE_GROUPS.map((group) => (
            <div
              key={group.titleKey}
              className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs"
            >
              <div className="border-b border-gray-100 bg-[#faf9f5] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.titleKey)}
              </div>
              <ul className="divide-y divide-gray-100">
                {group.rows.map((row) => {
                  const available = row.availability[activePlanIndex];
                  return (
                    <li
                      key={row.labelKey}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3.5 transition-colors",
                        available ? "bg-white" : "bg-gray-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm",
                          available
                            ? "font-medium text-foreground"
                            : "text-muted-foreground/60"
                        )}
                      >
                        {t(row.labelKey)}
                      </span>
                      <div className="shrink-0">
                        {available ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <Minus className="h-3.5 w-3.5 stroke-2" />
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* --- GIAO DIỆN DESKTOP / TABLET (hidden md:block) --- */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_META[planId];
            return (
              <div
                key={planId}
                className={cn(
                  "rounded-2xl border bg-white px-5 py-6 sm:px-6",
                  plan.highlight
                    ? "border-orange-300 shadow-sm shadow-orange-500/5"
                    : "border-gray-200/80"
                )}
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {t(plan.nameKey)}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {t(plan.priceKey)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white sm:mt-12">
          <table className="w-full min-w-160 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-white px-4 py-4 font-semibold text-foreground sm:px-6 sm:py-5">
                  {t("lpms_web_pricing_feature_col")}
                </th>
                {PLAN_ORDER.map((planId) => (
                  <th
                    key={planId}
                    className={cn(
                      "px-3 py-4 text-center font-semibold text-foreground sm:px-4 sm:py-5",
                      PLAN_META[planId].highlight && "bg-orange-50/40"
                    )}
                  >
                    {t(PLAN_META[planId].nameKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((group) => (
                <FeatureGroupRows
                  key={group.titleKey}
                  group={group}
                  t={t}
                  includedLabel={t("lpms_web_pricing_included")}
                  excludedLabel={t("lpms_web_pricing_excluded")}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12 sm:mt-14">
        <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t("lpms_web_pricing_addons_title")}
        </h3>
        <ul className="mt-5 divide-y divide-gray-100 border-t border-b border-gray-100">
          {ADDONS.map((addon) => (
            <li
              key={addon.nameKey}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t(addon.nameKey)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t(addon.descKey)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-foreground sm:text-base">
                {t(addon.priceKey)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 sm:mt-14">
        <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t("lpms_web_pricing_process_title")}
        </h3>
        <ol className="mt-5 space-y-4">
          {PROCESS_STEPS.map((stepKey, index) => (
            <li key={stepKey} className="flex gap-4 sm:gap-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-700">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t(stepKey)}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("lpms_web_pricing_cta_note")}
        </p>
        <Button size="lg" className="shrink-0 shadow-md shadow-orange-900/10" asChild>
          <Link href="/contact">{t("lpms_web_pricing_cta")}</Link>
        </Button>
      </div>
    </LpmsFeatureShell>
  );
}

function FeatureGroupRows({
  group,
  t,
  includedLabel,
  excludedLabel,
}: {
  group: FeatureGroup;
  t: (key: string) => string;
  includedLabel: string;
  excludedLabel: string;
}) {
  return (
    <>
      <tr className="border-t border-gray-100 bg-[#faf9f5]/60">
        <td
          colSpan={4}
          className="px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:px-6"
        >
          {t(group.titleKey)}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.labelKey} className="border-t border-gray-50">
          <td className="sticky left-0 z-10 bg-white px-4 py-3.5 text-foreground/90 sm:px-6">
            {t(row.labelKey)}
          </td>
          {row.availability.map((available, i) => (
            <td
              key={`${row.labelKey}-${i}`}
              className={cn(
                "px-3 py-3.5 text-center sm:px-4",
                PLAN_META[PLAN_ORDER[i]].highlight && "bg-orange-50/30"
              )}
            >
              <AvailabilityCell
                available={available}
                includedLabel={includedLabel}
                excludedLabel={excludedLabel}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
