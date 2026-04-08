"use client";

import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Plan, QuotaLimits } from "@/types/plan";
import { formatStorageDisplay } from "@/types/plan";
import { useT } from "@/components/i18n-provider";

export function computeYearlySavings(plan: Plan, allPlans: Plan[]): { months: number; percent: number; originalPrice: number } | null {
  if (plan.billingCycle !== "yearly" || plan.contactSales || plan.price === 0) return null;
  const monthlySlug =
    (plan.quotaLimits as { monthlyEquivalentSlug?: string } | null)
      ?.monthlyEquivalentSlug ??
    (plan.slug.endsWith("-yearly")
      ? plan.slug.replace(/-yearly$/, "-monthly")
      : null);
  if (!monthlySlug) return null;
  const monthly = allPlans.find((p) => p.slug === monthlySlug);
  if (!monthly || monthly.price === 0) return null;
  const yearlyFull = monthly.price * 12;
  const savings = yearlyFull - plan.price;
  if (savings <= 0) return null;
  const months = Math.round(savings / monthly.price);
  const percent = Math.round((savings / yearlyFull) * 100);
  return { months, percent, originalPrice: yearlyFull };
}

interface PricingCardProps {
  plan: Plan;
  currentPlanSlug?: string | null;
  loading?: boolean;
  onSelect: (planId: string, slug: string, plan: Plan) => void;
  variant?: "default" | "compact";
  allPlans?: Plan[];
}

function getQuotaLimits(plan: Plan) {
  const q = plan.quotaLimits;
  if (!q) return null;
  return {
    dailyQuota: q.dailyAiQuota,
    storageBytes: q.storageBytes,
    members: q.workspaceMembers,
    templates: q.templates,
    aiAssistant: q.aiAssistant ?? false,
    maxSources: q.maxSources,
    citationsEnabled: q.citationsEnabled ?? false,
    urlSourceEnabled: q.urlSourceEnabled ?? false,
    systemSourceAccess: q.systemSourceAccess ?? 'basic',
  };
}

export function PricingCard({
  plan,
  currentPlanSlug,
  loading,
  onSelect,
  variant = "default",
  allPlans = [],
}: PricingCardProps) {
  const { t } = useT();
  const limits = getQuotaLimits(plan);
  const isCurrent = currentPlanSlug === plan.slug;
  const isFree = plan.price === 0;
  const savings = allPlans.length ? computeYearlySavings(plan, allPlans) : null;

  const handleClick = () => {
    if (isCurrent) return;
    if (isFree && !plan.contactSales) return;
    onSelect(plan.id, plan.slug, plan);
  };

  return (
    <Card
      className={
        plan.isHighlighted
          ? "border-primary shadow-lg relative"
          : "relative"
      }
    >
      <CardHeader>
        {savings && (
          <Badge variant="secondary" className="w-fit mb-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            {t("plan_save_months", { n: savings.months })}
          </Badge>
        )}
        {plan.isHighlighted && !savings && (
          <Badge className="w-fit mb-2">
            <Sparkles className="h-3 w-3 mr-1" />
            {t("plan_badge_popular")}
          </Badge>
        )}
        {isCurrent && (
          <Badge variant="secondary" className="w-fit mb-2 absolute top-6 right-6">
            {t("plan_badge_current")}
          </Badge>
        )}
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description ?? plan.nameEn ?? ""}</CardDescription>
        <div className="mt-4">
          {plan.price === 0 && !plan.contactSales ? (
            <p className="text-3xl font-bold">{t("plan_price_free")}</p>
          ) : plan.contactSales ? (
            <p className="text-2xl font-bold">{t("plan_price_contact")}</p>
          ) : (() => {
            const q = plan.quotaLimits as QuotaLimits | null;
            const isPerSeat = q?.pricePerSeat != null && q?.minSeats != null;
            const cycle = plan.billingCycle === "yearly" ? "plan_price_per_year" : "plan_price_per_month";
            if (isPerSeat) {
              return (
                <>
                  <p className="text-3xl font-bold">
                    {t("plan_price_from", { n: plan.price.toLocaleString("vi-VN") })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("plan_price_per_seat", { n: q!.pricePerSeat!.toLocaleString("vi-VN") })}
                  </p>
                </>
              );
            }
            return (
              <>
                {savings && (
                  <p className="text-sm text-muted-foreground line-through">
                    {t("plan_original_price", { n: savings.originalPrice.toLocaleString("vi-VN") })}
                  </p>
                )}
                <p className="text-3xl font-bold">
                  {plan.price.toLocaleString("vi-VN")} ₫
                </p>
                <p className="text-sm text-muted-foreground">{t(cycle)}</p>
              </>
            );
          })()}
        </div>
      </CardHeader>

      {variant !== "compact" && limits && (
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {typeof limits.dailyQuota === "number"
                ? t("plan_quota_ai_per_day", { n: limits.dailyQuota })
                : t("plan_quota_unlimited_ai")}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {limits.templates === "unlimited"
                ? t("plan_templates_unlimited")
                : t("plan_templates_count", { n: limits.templates ?? 0 })}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {t("plan_storage_label", { size: formatStorageDisplay(limits.storageBytes, t) })}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {typeof limits.members === "number"
                ? t("plan_members_count", { n: limits.members })
                : t("plan_members_unlimited")}
            </li>
            {limits.aiAssistant && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {t("plan_feature_ai_assistant")}
              </li>
            )}
            {limits.maxSources != null && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {limits.maxSources === 'unlimited'
                  ? t("plan_sources_unlimited")
                  : t("plan_sources_count", { n: limits.maxSources })}
              </li>
            )}
            {limits.citationsEnabled && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {t("plan_feature_citations")}
              </li>
            )}
            {limits.urlSourceEnabled && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {t("plan_feature_url_sources")}
              </li>
            )}
            {limits.systemSourceAccess !== 'basic' && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {limits.systemSourceAccess === 'premium'
                  ? t("plan_feature_premium_legal_db")
                  : t("plan_feature_full_legal_db")}
              </li>
            )}
          </ul>
        </CardContent>
      )}

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.isHighlighted ? "default" : "outline"}
          onClick={handleClick}
          disabled={loading || isCurrent || (isFree && !plan.contactSales)}
        >
          {loading
            ? t("plan_btn_processing")
            : plan.contactSales
            ? t("plan_btn_contact_sales")
            : isCurrent
            ? t("plan_btn_current")
            : isFree
            ? t("plan_price_free")
            : t("plan_btn_upgrade")}
        </Button>
      </CardFooter>
    </Card>
  );
}
