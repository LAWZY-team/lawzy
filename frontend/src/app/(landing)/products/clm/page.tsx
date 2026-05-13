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
      <section className="relative overflow-hidden pt-[6.5rem] pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(234,88,12,0.1),transparent_55%)]" aria-hidden />
        <div className={sectionContainer}>
          <Badge variant="outline" className="border-orange-200/90 bg-white/60 text-orange-600 shadow-sm backdrop-blur-sm">
            {t("product_badge")}
          </Badge>
          <h1 className="mt-5 max-w-4xl text-balance text-3xl font-bold tracking-tight text-foreground sm:mt-6 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            {t("product_clm_title")}
          </h1>
          <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t("product_clm_page_subtitle")}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition-colors hover:gap-1.5 hover:text-orange-700"
          >
            {t("product_back_home")}
          </Link>
          <div className="relative mx-auto mt-12 w-full max-w-5xl sm:mt-14">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-100 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] sm:rounded-3xl">
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
