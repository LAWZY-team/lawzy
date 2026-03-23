"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlans } from "@/hooks/plans/use-plans";
import { useContactModal } from "./contact-modal";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import type { Plan } from "@/types/plan";
import { loginPathWithReturn } from "@/lib/auth";

const MONTHLY_SLUGS = ["free", "pro-monthly", "team"] as const;
const YEARLY_SLUGS = ["free", "pro-yearly", "enterprise"] as const;

function filterPlans(plans: Plan[], yearly: boolean): Plan[] {
  const slugList: readonly string[] = yearly ? YEARLY_SLUGS : MONTHLY_SLUGS;
  return plans
    .filter((p) => slugList.includes(p.slug))
    .sort((a, b) => slugList.indexOf(a.slug) - slugList.indexOf(b.slug));
}

export default function LandingPricingSection() {
  const { t } = useI18n();
  const router = useRouter();
  const { open } = useContactModal();
  const [billingYearly, setBillingYearly] = useState(false);
  const { data: plans, isLoading } = usePlans();
  const displayedPlans = useMemo(
    () => (plans ? filterPlans(plans, billingYearly) : []),
    [plans, billingYearly]
  );

  const handleSelectPlan = (planId: string, slug: string) => {
    if (slug === "enterprise") {
      open();
      return;
    }
    router.push(loginPathWithReturn("/payment"));
  };

  if (isLoading) {
    return (
      <Section id="pricing" spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
        <div className={sectionContainer}>
          <SectionHeader title={t("pricing_section_title")} subtitle={t("pricing_section_subtitle")} margin="tight" />
          <div className="grid gap-6 md:grid-cols-3 mt-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  if (!plans?.length) return null;

  return (
    <Section id="pricing" spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <SectionHeader
          title={t("pricing_section_title")}
          subtitle={t("pricing_section_subtitle")}
          margin="tight"
        />
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
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {displayedPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlanSlug={null}
              onSelect={handleSelectPlan}
              allPlans={plans}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
