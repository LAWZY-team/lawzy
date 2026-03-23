"use client";

import { usePlans } from "@/hooks/plans/use-plans";
import { PricingCard } from "./pricing-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/i18n-provider";

interface PricingSectionProps {
  currentPlanSlug?: string | null;
  onSelectPlan?: (planId: string, slug: string) => void;
  loadingPlanId?: string | null;
  variant?: "default" | "compact";
  title?: string;
  subtitle?: string;
}

export function PricingSection({
  currentPlanSlug,
  onSelectPlan,
  loadingPlanId,
  variant = "default",
  title,
  subtitle,
}: PricingSectionProps) {
  const { t } = useT();
  const sectionTitle = title ?? t("pricing_section_title");
  const sectionSubtitle = subtitle ?? t("pricing_section_subtitle");
  const { data: plans, isLoading } = usePlans();

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
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentPlanSlug={currentPlanSlug}
              loading={loadingPlanId === plan.id}
              onSelect={onSelectPlan ?? (() => {})}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
