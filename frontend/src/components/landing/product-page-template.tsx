"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "./language-provider";
import { sectionContainer } from "./landing-section";
import { Button } from "@/components/ui/button";
import { useContactModal } from "./contact-modal";
import { cn } from "@/lib/utils";

type ProductPageTemplateProps = {
  productKey: "clm" | "lpms";
  heroImageSrc?: string;
};

const USE_CASE_COUNT = 4;
const AUTO_ROLL_MS = 4000;
const RESUME_AFTER_INTERACTION_MS = 5000;

export default function ProductPageTemplate({ productKey, heroImageSrc = "/hero.gif" }: ProductPageTemplateProps) {
  const { t } = useI18n();
  const { open } = useContactModal();
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
          <Button size="lg" className="mt-8 shadow-md shadow-orange-900/10" onClick={open}>
            {t("product_request_demo")}
          </Button>
          <div className="relative mx-auto mt-12 w-full max-w-5xl sm:mt-14">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-100 shadow-[0_28px_70px_-24px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] sm:rounded-3xl">
              <Image
                src={heroImageSrc}
                alt={t(titleKey)}
                fill
                priority
                sizes="(min-width: 640px) 90vw, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>
      <section className="bg-zinc-950 py-16 text-white sm:py-20 md:py-24">
        <div className={sectionContainer}>
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl md:mb-14">{t("product_how_teams_use")}</h2>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              {useCases.map((useCase, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={useCase.titleKey}
                    type="button"
                    onClick={() => handleSelect(index)}
                    className={cn(
                      "w-full border-b py-5 text-left transition-colors",
                      isActive ? "border-orange-500" : "border-zinc-700"
                    )}
                  >
                    <h3 className={cn("text-lg font-semibold", isActive ? "text-white" : "text-zinc-400")}>
                      {t(useCase.titleKey)}
                    </h3>
                    {isActive ? (
                      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t(useCase.descKey)}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8">
              <div className="text-center">
                <p className="text-sm uppercase tracking-widest text-zinc-500">Preview</p>
                <p className="mt-4 text-xl font-semibold text-white">{t(useCases[activeIndex].titleKey)}</p>
                <p className="mt-3 max-w-md text-sm text-zinc-400">{t(useCases[activeIndex].descKey)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-zinc-800 bg-zinc-950 py-10 text-white sm:py-12">
        <div className={cn(sectionContainer, "flex flex-col items-center justify-between gap-6 sm:flex-row")}>
          <p className="max-w-xl text-center text-lg font-bold sm:text-left sm:text-xl">{t("product_footer_cta_title")}</p>
          <Button variant="secondary" size="lg" className="shrink-0 bg-white text-zinc-900 hover:bg-zinc-100" onClick={open}>
            {t("product_request_demo")}
          </Button>
        </div>
      </section>
    </>
  );
}
