"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "./language-provider";
import { sectionContainer } from "./landing-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductPageTemplateProps = {
  productKey: "clm" | "lpms";
};

const USE_CASE_COUNT = 4;
const AUTO_ROLL_MS = 4000;
const RESUME_AFTER_INTERACTION_MS = 5000;

export default function ProductPageTemplate({ productKey }: ProductPageTemplateProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const autoRollPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleKey = productKey === "clm" ? "product_clm_title" : "product_lpms_title";
  const subtitleKey = productKey === "clm" ? "product_clm_page_subtitle" : "product_lpms_page_subtitle";
  const useCases = Array.from({ length: USE_CASE_COUNT }, (_, i) => ({
    titleKey: `product_use_case_${i + 1}_title` as const,
    descKey: `product_use_case_${i + 1}_desc` as const,
  }));
  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
    autoRollPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      autoRollPausedRef.current = false;
    }, RESUME_AFTER_INTERACTION_MS);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!autoRollPausedRef.current) {
        setActiveIndex((prev) => (prev + 1) % USE_CASE_COUNT);
      }
    }, AUTO_ROLL_MS);
    return () => {
      clearInterval(timer);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);
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
            {t(titleKey)}
          </h1>
          <p className="mt-5 max-w-3xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t(subtitleKey)}
          </p>
          <Button size="lg" className="mt-8 shadow-md shadow-orange-900/10" asChild>
            <Link href="/contact">
              {t("floating_book_demo")}
            </Link>
          </Button>
        </div>
      </section>
      <section className="bg-zinc-950 py-16 text-white sm:py-20 md:py-24">
        <div className={sectionContainer}>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl md:mb-16">
            {t("product_how_teams_use")}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {useCases.map((useCase, index) => {
              const isActive = index === activeIndex;
              const stepNum = String(index + 1).padStart(2, "0");
              return (
                <div
                  key={useCase.titleKey}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => handleSelect(index)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-6 sm:p-8 transition-all duration-300 ease-out cursor-pointer",
                    isActive
                      ? "border-orange-500/80 bg-zinc-900/90 shadow-[0_0_30px_-5px_rgba(249,115,22,0.25)] scale-[1.015]"
                      : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-mono text-3xl sm:text-4xl font-black tracking-tighter transition-colors duration-300",
                          isActive
                            ? "text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]"
                            : "text-zinc-700 group-hover:text-zinc-500"
                        )}
                      >
                        {stepNum}
                      </span>
                    </div>
                    <h3
                      className={cn(
                        "mt-6 text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-300",
                        isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
                      )}
                    >
                      {t(useCase.titleKey)}
                    </h3>
                    <p
                      className={cn(
                        "mt-3 text-sm sm:text-base leading-relaxed transition-colors duration-300",
                        isActive ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-400"
                      )}
                    >
                      {t(useCase.descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
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
