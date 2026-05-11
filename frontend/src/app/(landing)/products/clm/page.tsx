"use client";

import Link from "next/link";
import Image from "next/image";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";
import { useI18n } from "@/components/landing/language-provider";
import { sectionContainer } from "@/components/landing/landing-section";
import ClmFeaturesSection from "@/components/landing/clm-features-section";
import CostSection from "@/components/landing/cost-section";
import LandingPricingSection from "@/components/landing/landing-pricing-section";
import TargetSection from "@/components/landing/target-section";
import { Badge } from "@/components/ui/badge";

export default function ClmProductPage() {
  const { t } = useI18n();
  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <section className="pt-[6.5rem] pb-10 sm:pt-28 sm:pb-14 md:pt-32">
        <div className={sectionContainer}>
          <Badge variant="outline" className="border-orange-300 text-orange-600">
            {t("product_badge")}
          </Badge>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t("product_clm_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("product_clm_page_subtitle")}
          </p>
          <Link href="/" className="mt-6 inline-flex text-sm font-medium text-orange-600 hover:text-orange-700">
            {t("product_back_home")}
          </Link>
          <div className="relative mx-auto mt-10 w-full max-w-5xl">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.2)] ring-1 ring-black/5 sm:rounded-3xl">
              <Image
                src="/hero.gif"
                alt="Lawzy CLM platform demo"
                fill
                priority
                sizes="(min-width: 640px) 90vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-4 h-40 w-40 rounded-full bg-orange-200/35 blur-3xl sm:-right-8" aria-hidden />
            <div className="pointer-events-none absolute -left-6 -top-8 h-44 w-44 rounded-full bg-sky-200/30 blur-3xl" aria-hidden />
          </div>
        </div>
      </section>
      <ClmFeaturesSection />
      <CostSection />
      <LandingPricingSection />
      <TargetSection />
      <LandingFooter />
      <FloatingActions />
    </div>
  );
}
