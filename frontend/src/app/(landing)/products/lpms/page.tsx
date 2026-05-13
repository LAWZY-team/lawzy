"use client";

import Link from "next/link";
import { Scale, BriefcaseBusiness, Workflow } from "lucide-react";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingActions } from "@/components/landing/floating-actions";
import { useI18n } from "@/components/landing/language-provider";
import { Section, SectionHeader, sectionContainer } from "@/components/landing/landing-section";
import FadeInOnScroll from "@/components/landing/fade-in-on-scroll";
import { Badge } from "@/components/ui/badge";

export default function LpmsProductPage() {
  const { t } = useI18n();
  const highlights = [
    { icon: Workflow, title: t("lpms_highlight_1_title"), description: t("lpms_highlight_1_desc") },
    { icon: Scale, title: t("lpms_highlight_2_title"), description: t("lpms_highlight_2_desc") },
    { icon: BriefcaseBusiness, title: t("lpms_highlight_3_title"), description: t("lpms_highlight_3_desc") },
  ] as const;
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
            {t("product_lpms_title")}
          </h1>
          <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t("product_lpms_page_subtitle")}
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition-colors hover:gap-1.5 hover:text-orange-700"
          >
            {t("product_back_home")}
          </Link>
        </div>
      </section>
      <Section spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
        <div className={sectionContainer}>
          <SectionHeader title={t("lpms_highlights_title")} subtitle={t("lpms_highlights_subtitle")} margin="tight" />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8 lg:gap-10">
            {highlights.map((highlight, index) => (
              <FadeInOnScroll key={highlight.title} delay={index * 0.08}>
                <div className="h-full rounded-3xl border border-gray-100/90 bg-white/90 p-6 shadow-sm shadow-black/[0.03] ring-1 ring-black/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-100/90 hover:shadow-xl hover:shadow-orange-900/[0.06] dark:border-gray-800 dark:bg-gray-900/90 dark:ring-white/[0.06] sm:p-8">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-inner shadow-orange-100/40 dark:bg-orange-900/30">
                    <highlight.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{highlight.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{highlight.description}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </Section>
      <LandingFooter />
      <FloatingActions />
    </div>
  );
}
