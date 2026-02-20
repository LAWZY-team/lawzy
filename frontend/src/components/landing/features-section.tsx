"use client";

import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";

function getVideoSources(src: string): { webm: string; mp4: string } {
  const base = src.replace(/\.(webm|mp4)$/, "");
  return { webm: `${base}.webm`, mp4: `${base}.mp4` };
}

function FeatureCard({ title, description, videoSrc, videoAlt, reverse = false }: {
  title: string; description: string; videoSrc: string; videoAlt: string; reverse?: boolean;
}) {
  const sources = getVideoSources(videoSrc);
  return (
    <div className={`group flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-1 bg-white dark:bg-gray-900 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 sm:p-8 md:p-10 lg:p-12 border border-gray-100 dark:border-gray-800`}>
      <div className="w-full h-full lg:w-3/5 flex-shrink-0">
        <div className="relative w-full sm:aspect-video lg:aspect-square lg:w-[600px] lg:h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-md group-hover:shadow-lg transition-shadow duration-300">
          <video autoPlay loop muted playsInline aria-label={videoAlt} className="w-full h-full object-cover">
            <source src={sources.webm} type="video/webm" />
            <source src={sources.mp4} type="video/mp4" />
          </video>
        </div>
      </div>
      <div className="w-full lg:w-2/5 lg:px-4 lg:text-left flex flex-col justify-center text-center">
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 lg:mb-6 leading-tight">{title}</h3>
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-tight">{description}</p>
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
    <FadeInOnScroll>
      <section id="features" className="py-16 sm:py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 tracking-tight">{t("features_title")}</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">{t("features_subtitle")}</p>
          </div>
          <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 lg:gap-14">
            {features.map((feature, index) => (
              <FeatureCard key={index} title={t(feature.titleKey)} description={t(feature.descKey)} videoSrc={feature.video} videoAlt={feature.alt} reverse={feature.reverse} />
            ))}
          </div>
        </div>
      </section>
    </FadeInOnScroll>
  );
}
