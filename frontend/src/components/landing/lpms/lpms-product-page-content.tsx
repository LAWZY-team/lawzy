"use client";

import Link from "next/link";
import { useI18n } from "../language-provider";
import { sectionContainer } from "../landing-section";
import { Button } from "@/components/ui/button";
import { LpmsPartnerFeaturesSection } from "./lpms-partner-features-section";
import { cn } from "@/lib/utils";

export function LpmsProductPageContent() {
  const { t } = useI18n();

  return (
    <>
      <section className="relative overflow-hidden pt-[6.5rem] pb-12 sm:pt-28 sm:pb-16 md:pt-32 md:pb-20">
        <div className={sectionContainer}>
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 transition-colors hover:gap-1.5 hover:text-orange-700"
          >
            {t("product_back_home")}
          </Link>
          <h1 className="mt-5 max-w-4xl text-balance text-3xl font-bold tracking-tight text-foreground sm:mt-6 sm:text-4xl md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            {t("product_lpms_title")}
          </h1>
          <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t("product_lpms_page_subtitle")}
          </p>
          <Button size="lg" className="mt-8 shadow-md shadow-orange-900/10" asChild>
            <Link href="/contact">
              {t("floating_book_demo")}
            </Link>
          </Button>
        </div>
      </section>
      <LpmsPartnerFeaturesSection />
      <section className="border-t border-zinc-800 bg-zinc-950 py-10 text-white sm:py-12">
        <div className={cn(sectionContainer, "flex flex-col items-center justify-between gap-6 sm:flex-row")}>
          <p className="max-w-xl text-center text-lg font-bold sm:text-left sm:text-xl">{t("product_footer_cta_title")}</p>
          <Button variant="secondary" size="lg" className="shrink-0 bg-white text-zinc-900 hover:bg-zinc-100" asChild>
            <Link href="/contact">
              {t("floating_book_demo")}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
