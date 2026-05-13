"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { sectionContainer } from "./landing-section";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function HeroRotatingText({ options, fallback }: { options: string[]; fallback: string }) {
  const [idx, setIdx] = useState(0);
  const list = options.length > 0 ? options : [fallback];
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), 3000);
    return () => clearInterval(id);
  }, [list.length]);
  return <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{list[idx]}</span>;
}

const HERO_TRUST_LOGOS = [
  { src: "/partners_logo/newpaper/businesstimess.svg", alt: "Business Times" },
  { src: "/partners_logo/newpaper/vneconomy.svg", alt: "VnEconomy" },
] as const;

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-x-clip pb-16 pt-[5.5rem] sm:pb-20 sm:pt-28 md:pb-24 md:pt-32 lg:pb-28">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(234,88,12,0.14),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_100%_0%,rgba(14,165,233,0.06),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/70 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#faf9f5] to-transparent sm:h-40" aria-hidden />

      <FadeInOnScroll>
        <div className={cn(sectionContainer, "relative")}>
          <div className="flex flex-col items-center text-center">

            <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl sm:leading-[1.1] md:text-5xl lg:max-w-5xl lg:text-6xl lg:leading-[1.08]">
              <span className="block">{t("hero_title_1").trim()}</span>
              <span className="mt-1 block sm:mt-0">
                <HeroRotatingText
                  options={(t("hero_title_2_options") || "")
                    .split("|")
                    .map((s) => s.trim())
                    .filter(Boolean)}
                  fallback={t("hero_title_2")}
                />
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-8 sm:text-lg md:max-w-3xl md:text-xl">
              {t("hero_subtitle")}
            </p>

            <div className="mt-9 flex w-full max-w-md flex-col items-stretch gap-4 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              <Button asChild size="lg" className="h-12 w-full shadow-md shadow-orange-900/10 sm:h-12 sm:w-auto sm:min-w-[11.5rem]">
                <Link href="/products/clm">{t("hero_cta_clm")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full border-gray-200/90 bg-white/80 backdrop-blur-sm hover:bg-white sm:h-12 sm:w-auto sm:min-w-[11.5rem]"
              >
                <Link href="/products/lpms">{t("hero_cta_lpms")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground/90">{t("hero_cta_hint")}</p>

            <div className="mt-14 flex w-full max-w-2xl flex-col items-center gap-5 border-t border-gray-200/60 pt-10 sm:mt-16 sm:gap-6 sm:pt-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.22em]">
                {t("hero_trust")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10">
                {HERO_TRUST_LOGOS.map((logo, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative h-9 w-auto opacity-[0.72] grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:h-10"
                    )}
                  >
                    <Image src={logo.src} alt={logo.alt} width={88} height={36} className="h-9 w-auto object-contain sm:h-10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeInOnScroll>
    </section>
  );
}
