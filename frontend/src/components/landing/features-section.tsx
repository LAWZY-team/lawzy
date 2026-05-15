"use client";

import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { SectionCta } from "./section-cta";
import { cn } from "@/lib/utils";

function getVideoSources(src: string): { webm: string; mp4: string } {
  const base = src.replace(/\.(webm|mp4)$/, "");
  return { webm: `${base}.webm`, mp4: `${base}.mp4` };
}

function FeatureCard({
  title,
  description,
  videoSrc,
  videoAlt,
  reverse = false,
}: {
  title: string;
  description: string;
  videoSrc: string;
  videoAlt: string;
  reverse?: boolean;
}) {
  const sources = getVideoSources(videoSrc);
  return (
    <div
      className={cn(
        "group flex min-w-0 max-w-full flex-col items-stretch gap-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-lg transition-all duration-300 hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:p-8 md:p-10 lg:flex-row lg:items-center lg:gap-10 lg:p-10 xl:gap-12 xl:p-12",
        reverse && "lg:flex-row-reverse"
      )}
    >
      <div className="w-full min-w-0 lg:flex-1 lg:max-w-[min(100%,38rem)] xl:max-w-[min(100%,42rem)]">
        <div className="relative mx-auto aspect-video w-full max-w-full overflow-hidden rounded-2xl bg-gray-50 shadow-md transition-shadow duration-300 group-hover:shadow-lg dark:bg-gray-800 lg:aspect-square">
          <video autoPlay loop muted playsInline aria-label={videoAlt} className="h-full w-full object-cover">
            <source src={sources.webm} type="video/webm" />
            <source src={sources.mp4} type="video/mp4" />
          </video>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col justify-center text-center lg:max-w-xl lg:px-2 lg:text-left xl:px-4">
        <h3 className="mb-4 text-xl font-bold leading-tight text-foreground sm:text-2xl lg:mb-6 lg:text-3xl">{title}</h3>
        <p className="text-base leading-snug text-muted-foreground sm:text-lg lg:text-xl">{description}</p>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const { t } = useI18n();

  const features = [
    { titleKey: "feature_card1_title", descKey: "feature_card1_desc", video: "/01-soan-thao.webm", alt: "Contract drafting demo", reverse: false },
    { titleKey: "feature_card2_title", descKey: "feature_card2_desc", video: "/02-ra-soat-rui-ro.webm", alt: "Risk review demo", reverse: true },
    { titleKey: "feature_card3_title", descKey: "feature_card3_desc", video: "/03-quan-ly.webm", alt: "Contract management demo", reverse: false },
  ];

  return (
    <Section id="features" className="overflow-x-visible">
      <FadeInOnScroll>
        <div className={sectionContainer}>
          <SectionHeader title={t("features_title")} subtitle={t("features_subtitle")} margin="loose" accent />
          <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 lg:gap-14">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                title={t(feature.titleKey)}
                description={t(feature.descKey)}
                videoSrc={feature.video}
                videoAlt={feature.alt}
                reverse={feature.reverse}
              />
            ))}
          </div>
          <div className="mt-12 flex justify-center sm:mt-16">
            <SectionCta hint={t("hero_cta_hint")} />
          </div>
        </div>
      </FadeInOnScroll>
    </Section>
  );
}
