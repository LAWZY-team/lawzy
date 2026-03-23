"use client";

import { useEffect, useState } from "react";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { sectionContainer } from "./landing-section";
import { SectionCta } from "./section-cta";
import Image from "next/image";
import { Gift } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function HeroRotatingText({ options, fallback }: { options: string[]; fallback: string }) {
  const [idx, setIdx] = useState(0);
  const list = options.length > 0 ? options : [fallback];
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), 3000);
    return () => clearInterval(id);
  }, [list.length]);
  return <span className="text-orange-600">{list[idx]}</span>;
}

const HERO_TRUST_LOGOS = [
  { src: "/partners_logo/newpaper/businesstimess.svg", alt: "Business Times" },
  { src: "/partners_logo/newpaper/vneconomy.svg", alt: "VnEconomy" },
  { src: "/partners_logo/newpaper/ulaw.png", alt: "HCMU Law", scale: true },
];

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-x-clip pt-[5.5rem] sm:pt-28 md:pt-32 pb-14 sm:pb-16 lg:pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(234,88,12,0.12),transparent_55%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/60 to-transparent" aria-hidden />

      <FadeInOnScroll>
        <div className={cn(sectionContainer, "relative")}>
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mb-4"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 16px rgba(234,88,12,0.1)",
                    "0 0 28px rgba(234,88,12,0.2)",
                    "0 0 16px rgba(234,88,12,0.1)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-fit rounded-full"
              >
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-2 rounded-full border border-orange-300 px-4 py-1.5 text-xs font-medium text-orange-600"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Gift className="h-3.5 w-3.5 shrink-0" />
                  </motion.span>
                  {t("hero_badge")}
                </Badge>
              </motion.div>
            </motion.div>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:leading-[1.15] xl:text-5xl">
              <span className="block">{t("hero_title_1").trim()}</span>
              <span className="block">
                <HeroRotatingText options={(t("hero_title_2_options") || "").split("|").map((s) => s.trim()).filter(Boolean)} fallback={t("hero_title_2")} />
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
              {t("hero_subtitle")}
            </p>

            <div className="mt-8">
              <SectionCta hint={t("hero_cta_hint")} />
            </div>

            <div className="relative mx-auto mt-14 w-full max-w-4xl">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.2)] ring-1 ring-black/5 sm:rounded-3xl">
                <Image
                  src="/hero.gif"
                  alt="Lawzy contract management platform"
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

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("hero_trust")}</p>
              <div className="flex items-center gap-5">
                {HERO_TRUST_LOGOS.map((logo, i) => (
                  <div key={i} className={cn("relative h-8 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all", logo.scale && "scale-125")}>
                    <Image src={logo.src} alt={logo.alt} width={80} height={32} className="h-8 w-auto object-contain" />
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
