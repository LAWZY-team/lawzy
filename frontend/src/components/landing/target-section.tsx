"use client";

import FadeInOnScroll from "./fade-in-on-scroll";
import { useI18n } from "./language-provider";
import { Scale, CheckCircle2 } from "lucide-react";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { SectionCta } from "./section-cta";

export default function TargetSection() {
  const { t } = useI18n();
  const targets = [
    {
      icon: Scale,
      titleKey: "target_legal_title",
      descKey: "target_legal_desc",
      featuresKey: ["target_legal_feat1", "target_legal_feat2", "target_legal_feat3"],
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/30",
      border: "hover:border-orange-200 dark:hover:border-orange-800",
    },
  ];

  return (
    <Section id="target" className="overflow-hidden" spacing="relaxed">
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader title={t("target_title")} subtitle={t("target_subtitle")} margin="default" />
        </FadeInOnScroll>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8">
          {targets.map((target, index) => {
            const Icon = target.icon;
            return (
              <FadeInOnScroll key={index} delay={index * 0.2}>
                <div
                  className={`group h-full rounded-3xl border border-gray-100/90 bg-white/90 p-6 shadow-sm shadow-black/[0.03] ring-1 ring-black/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-100/90 hover:shadow-xl hover:shadow-orange-900/[0.05] dark:border-gray-800 dark:bg-gray-900/90 dark:ring-white/[0.06] sm:p-8 ${target.border}`}
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl sm:mb-8 sm:h-16 sm:w-16 ${target.bg} ${target.color}`}>
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-foreground sm:mb-4 sm:text-2xl">{t(target.titleKey)}</h3>
                  <p className="mb-6 leading-relaxed text-muted-foreground sm:mb-8">{t(target.descKey)}</p>
                  <ul className="space-y-3">
                    {target.featuresKey.map((featureKey, idx) => (
                      <li key={idx} className="flex items-center text-muted-foreground">
                        <CheckCircle2 className={`mr-3 h-5 w-5 flex-shrink-0 ${target.color}`} />
                        <span className="font-medium">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeInOnScroll>
            );
          })}
        </div>
        <div className="mt-10 flex justify-center sm:mt-12">
          <SectionCta hint={t("hero_cta_hint")} />
        </div>
      </div>
    </Section>
  );
}
