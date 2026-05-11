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
      <section className="pt-[6.5rem] pb-10 sm:pt-28 sm:pb-14 md:pt-32">
        <div className={sectionContainer}>
          <Badge variant="outline" className="border-orange-300 text-orange-600">
            {t("product_badge")}
          </Badge>
          <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t("product_lpms_title")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("product_lpms_page_subtitle")}
          </p>
          <Link href="/" className="mt-6 inline-flex text-sm font-medium text-orange-600 hover:text-orange-700">
            {t("product_back_home")}
          </Link>
        </div>
      </section>
      <Section spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
        <div className={sectionContainer}>
          <SectionHeader title={t("lpms_highlights_title")} subtitle={t("lpms_highlights_subtitle")} margin="tight" />
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {highlights.map((highlight, index) => (
              <FadeInOnScroll key={highlight.title} delay={index * 0.08}>
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/30">
                    <highlight.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{highlight.title}</h3>
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
