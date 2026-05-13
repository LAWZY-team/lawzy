"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlans, filterPlansForDisplay } from "@/hooks/plans/use-plans";
import { useContactModal } from "./contact-modal";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import type { Plan } from "@/types/plan";
import { loginPathWithReturn } from "@/lib/auth";

export default function LandingPricingSection() {
  const { t } = useI18n();
  const router = useRouter();
  const { open } = useContactModal();
  const [billingYearly, setBillingYearly] = useState(false);
  const { data: plans, isLoading } = usePlans();
  const displayedPlans = useMemo(
    () => (plans ? filterPlansForDisplay(plans, billingYearly) : []),
    [plans, billingYearly]
  );

  const handleSelectPlan = (_planId: string, _slug: string, plan: Plan) => {
    if (plan.contactSales) {
      open();
      return;
    }
    router.push(loginPathWithReturn("/payment"));
  };

  if (isLoading) {
    return (
      <Section id="pricing" spacing="compact" className="border-t border-gray-100/80 bg-orange-50/25 dark:border-gray-800/80 dark:bg-orange-950/15">
        <div className={sectionContainer}>
          <SectionHeader title={t("pricing_section_title")} subtitle={t("pricing_section_subtitle")} margin="tight" />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  if (!plans?.length) return null;

  if (!displayedPlans.length) {
    return (
      <Section id="pricing" spacing="compact" className="border-t border-gray-100/80 bg-orange-50/25 dark:border-gray-800/80 dark:bg-orange-950/15">
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
          <p className="mt-8 text-center text-muted-foreground">
            {billingYearly ? t("pricing_no_yearly_plans") : t("pricing_no_monthly_plans")}
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section id="pricing" spacing="compact" className="border-t border-gray-100/80 bg-orange-50/25 dark:border-gray-800/80 dark:bg-orange-950/15">
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
        <div
          className={`mt-10 grid gap-8 ${
            displayedPlans.length <= 2
              ? "mx-auto max-w-2xl grid-cols-1 sm:grid-cols-2"
              : displayedPlans.length === 3
                ? "md:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}
        >
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
