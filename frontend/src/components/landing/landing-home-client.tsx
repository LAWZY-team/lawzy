"use client";

import { useEffect, useState } from "react";
import LandingHeader from "@/components/landing/landing-header";
import HeroSection from "@/components/landing/hero-section";
import { BlogCardsSection } from "@/components/landing/blog-cards-section";
import { Newspaper } from "@/components/landing/newspaper";
import ProductOverviewSection from "@/components/landing/product-overview-section";
import { Investors } from "@/components/landing/investors";
import SurveySection from "@/components/landing/survey-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";

export function LandingHomeClient() {
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
      <main id="main-content">
        <HeroSection />
        <ProductOverviewSection />
        <Investors />
        <BlogCardsSection />
        <Newspaper />
      </main>
      <div id="survey" className="sr-only" aria-hidden />
      <SurveySection isOpen={isSurveyOpen} onClose={() => setIsSurveyOpen(false)} />
      <LandingFooter />
      <FloatingActions />
    </div>
  );
}
