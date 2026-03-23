"use client";

import { useMemo, useState } from "react";
import { usePlans } from "@/hooks/plans/use-plans";
import { PricingCard } from "./pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/components/i18n-provider";
import type { Plan } from "@/types/plan";

const MONTHLY_SLUGS = ["free", "pro-monthly", "team"] as const;
const YEARLY_SLUGS = ["free", "pro-yearly", "enterprise"] as const;

function filterPlans(plans: Plan[], yearly: boolean): Plan[] {
  const slugList: readonly string[] = yearly ? YEARLY_SLUGS : MONTHLY_SLUGS;
  return plans
    .filter((p) => slugList.includes(p.slug))
    .sort((a, b) => slugList.indexOf(a.slug) - slugList.indexOf(b.slug));
}

interface PricingSectionProps {
  currentPlanSlug?: string | null;
  onSelectPlan?: (planId: string, slug: string) => void;
  loadingPlanId?: string | null;
  variant?: "default" | "compact";
  title?: string;
  subtitle?: string;
  showBillingSwitch?: boolean;
}

export function PricingSection({
  currentPlanSlug,
  onSelectPlan,
  loadingPlanId,
  variant = "default",
  title,
  subtitle,
  showBillingSwitch = true,
}: PricingSectionProps) {
  const { t } = useT();
  const [billingYearly, setBillingYearly] = useState(false);
  const sectionTitle = title ?? t("pricing_section_title");
  const sectionSubtitle = subtitle ?? t("pricing_section_subtitle");
  const { data: plans, isLoading } = usePlans();
  const displayedPlans = useMemo(
    () => (plans ? filterPlans(plans, billingYearly) : []),
    [plans, billingYearly]
  );

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!plans?.length) {
    return null;
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {sectionTitle}
          </h2>
          <p className="mt-1 text-muted-foreground">{sectionSubtitle}</p>
          {showBillingSwitch && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <span
                className={`text-sm font-medium ${!billingYearly ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t("payment_billing_monthly")}
              </span>
              <Switch checked={billingYearly} onCheckedChange={setBillingYearly} />
              <span
                className={`text-sm font-medium ${billingYearly ? "text-foreground" : "text-muted-foreground"}`}
              >
                {t("payment_billing_yearly")}
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {displayedPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlanSlug={currentPlanSlug}
              loading={loadingPlanId === plan.id}
              onSelect={onSelectPlan ?? (() => {})}
              variant={variant}
              allPlans={plans}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
