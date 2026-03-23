"use client";

import { useRouter } from "next/navigation";
import { usePlans } from "@/hooks/plans/use-plans";
import { useContactModal } from "./contact-modal";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";

export default function LandingPricingSection() {
  const { t } = useI18n();
  const router = useRouter();
  const { open } = useContactModal();
  const { data: plans, isLoading } = usePlans();

  const handleSelectPlan = (planId: string, slug: string) => {
    if (slug === "enterprise") {
      open();
      return;
    }
    router.push("/login?callbackUrl=/payment");
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
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlanSlug={null}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
