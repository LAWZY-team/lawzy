"use client";

import { useRouter } from "next/navigation";
import { loginPathWithReturn } from "@/lib/auth";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PricingSection } from "@/components/pricing/pricing-section";
import { ContactModalProvider } from "@/components/landing/contact-modal";
import { useContactModal } from "@/components/landing/contact-modal";

function PricingPageContent() {
  const router = useRouter();
  const { open: openContact } = useContactModal();

  const handleSelectPlan = (_planId: string, slug: string) => {
    if (slug === "enterprise") {
      openContact();
      return;
    }
    router.push(loginPathWithReturn("/payment"));
  };

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <main className="pt-24 pb-16">
        <PricingSection onSelectPlan={handleSelectPlan} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function PricingPage() {
  return (
    <ContactModalProvider>
      <PricingPageContent />
    </ContactModalProvider>
  );
}
