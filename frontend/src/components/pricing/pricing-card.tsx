"use client";

import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Plan, QuotaLimits } from "@/types/plan";
import { formatStorageDisplay } from "@/types/plan";
import { useT } from "@/components/i18n-provider";

interface PricingCardProps {
  plan: Plan;
  currentPlanSlug?: string | null;
  loading?: boolean;
  onSelect: (planId: string, slug: string) => void;
  variant?: "default" | "compact";
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
  };
}

export function PricingCard({
  plan,
  currentPlanSlug,
  loading,
  onSelect,
  variant = "default",
}: PricingCardProps) {
  const { t } = useT();
  const limits = getQuotaLimits(plan);
  const isCurrent = currentPlanSlug === plan.slug;
  const isFree = plan.slug === "free";

  const handleClick = () => {
    if (isCurrent || isFree) return;
    onSelect(plan.id, plan.slug);
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
        {plan.isHighlighted && (
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
