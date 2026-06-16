"use client";

import { useRouter } from "next/navigation";
import { loginPathWithReturn } from "@/lib/auth";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingSection } from "@/components/pricing/pricing-section";
import { sectionContainer } from "@/components/landing/landing-section";
import type { Plan } from "@/types/plan";

function PricingPageContent() {
  const router = useRouter();

  const handleSelectPlan = (_planId: string, _slug: string, plan: Plan) => {
    if (plan.contactSales) {
      router.push("/contact");
      return;
    }
    router.push(loginPathWithReturn("/clm/payment"));
  };

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <main className={`${sectionContainer} pb-20 pt-28 sm:pb-24 sm:pt-32 md:pt-36`}>
        <div className="pointer-events-none mb-10 h-px w-full max-w-md bg-orange-200/90 sm:mb-12" aria-hidden />
        <PricingSection onSelectPlan={handleSelectPlan} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function PricingPage() {
  return (
    <PricingPageContent />
  );
}
