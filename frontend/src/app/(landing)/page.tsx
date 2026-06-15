"use client";

import { useEffect, useState } from "react";
import LandingHeader from "@/components/landing/landing-header";
import HeroSection from "@/components/landing/hero-section";
import { NewsAndPressSection } from "@/components/landing/news-and-press-section";
import { Investors } from "@/components/landing/investors";
import ClmLpmsJourneySection from "@/components/landing/clm-lpms-journey-section";
import HookSection from "@/components/landing/hook-section";
import VisionTeamSection from "@/components/landing/vision-team-section";
import FaqSection from "@/components/landing/faq-section";
import SurveySection from "@/components/landing/survey-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";
// import ProductOverviewSection from "@/components/landing/product-overview-section";

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
      <Investors />
      <ClmLpmsJourneySection />
      <HookSection />
      <VisionTeamSection />
      <NewsAndPressSection />
      <FaqSection />
      {/* <ProductOverviewSection /> */}

      <div id="survey" className="sr-only" aria-hidden />
      <SurveySection isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />

      <LandingFooter />
      <FloatingActions />
    </div>
  );
}

export default function LandingPage() {
  return (
    <LandingPageContent />
  );
}
