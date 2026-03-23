"use client";

import { useEffect, useState, useRef } from "react";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { SectionCta } from "./section-cta";

const COST_STATS = [
  { valueKey: "cost_stat_efficiency", suffix: "x", labelKey: "cost_stat_efficiency_label", target: 10 },
  { valueKey: "cost_stat_productivity", suffix: "%", labelKey: "cost_stat_productivity_label", target: 39 },
  { valueKey: "cost_stat_savings", suffix: "%", labelKey: "cost_stat_savings_label", target: 70 },
] as const;

function useCountUp(target: number, suffix: string, isVisible: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 2.5);
      setValue(Math.round(target * easeOut));
      if (progress < 1 && !cancelled) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, isVisible, duration]);

  return value + suffix;
}

function CostStat({ stat, index, isVisible }: { stat: (typeof COST_STATS)[number]; index: number; isVisible: boolean }) {
  const { t } = useI18n();
  const displayValue = useCountUp(stat.target, stat.suffix, isVisible);
  return (
    <FadeInOnScroll delay={index * 0.05}>
      <div className="flex flex-col items-center text-center">
        <span className="text-3xl font-bold tracking-tight text-orange-600 sm:text-4xl md:text-5xl">
          {displayValue}
        </span>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:mt-1.5 sm:text-sm">
          {t(stat.labelKey)}
        </p>
      </div>
    </FadeInOnScroll>
  );
}

export default function CostSection() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => e.isIntersecting && setIsVisible(true),
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Section id="cost" spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80 dark:bg-gray-900/30">
      <div ref={sectionRef} className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader
            title={t("cost_title")}
            subtitle={t("cost_subtitle")}
            margin="tight"
            highlightWord={t("cost_title_highlight")}
          />
        </FadeInOnScroll>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {COST_STATS.map((stat, i) => (
            <CostStat key={stat.valueKey} stat={stat} index={i} isVisible={isVisible} />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground sm:mt-6">
          {t("cost_stats_note")}
        </p>
        <div className="mt-8 flex justify-center sm:mt-10">
          <SectionCta hint={t("hero_cta_hint")} />
        </div>
      </div>
    </Section>
  );
}
