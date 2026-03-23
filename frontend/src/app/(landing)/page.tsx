"use client";

import { useEffect, useState } from "react";
import { ContactModalProvider } from "@/components/landing/contact-modal";
import LandingHeader from "@/components/landing/landing-header";
import HeroSection from "@/components/landing/hero-section";
import { Newspaper } from "@/components/landing/newspaper";
import FeaturesSection from "@/components/landing/features-section";
import CostSection from "@/components/landing/cost-section";
import LandingPricingSection from "@/components/landing/landing-pricing-section";
import TargetSection from "@/components/landing/target-section";
import Achievement from "@/components/landing/achievement";
import { Incubation } from "@/components/landing/incubation";
import SurveySection from "@/components/landing/survey-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";

function LandingPageContent() {
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);

  useEffect(() => {
    const openIfHash = () => {
      if (window.location.hash === "#survey") setIsSurveyOpen(true);
    };
    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    return () => window.removeEventListener("hashchange", openIfHash);
  }, []);

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <CostSection />
      <LandingPricingSection />
      <TargetSection />
      <Achievement />
      <Incubation />
      <Newspaper />

      <div id="survey" className="sr-only" aria-hidden />
      <SurveySection isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />

      <LandingFooter />
      <FloatingActions />
    </div>
  );
}

export default function LandingPage() {
  return (
    <ContactModalProvider>
      <LandingPageContent />
    </ContactModalProvider>
  );
}
