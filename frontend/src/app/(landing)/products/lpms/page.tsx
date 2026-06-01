"use client";

import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";
import { LpmsProductPageContent } from "@/components/landing/lpms/lpms-product-page-content";

export default function LpmsProductPage() {
  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <LpmsProductPageContent />
      <LandingFooter />
      <FloatingActions />
    </div>
  );
}
