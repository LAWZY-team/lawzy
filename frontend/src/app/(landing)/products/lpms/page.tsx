"use client";

import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";
import ProductPageTemplate from "@/components/landing/product-page-template";

export default function LpmsProductPage() {
  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <ProductPageTemplate productKey="lpms" />
      <LandingFooter />
      <FloatingActions />
    </div>
  );
}
