"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { InfiniteMarquee } from "./infinite-marquee";
import { Section, SectionHeader, sectionContainer } from "./landing-section";

type OrgLogoItem = {
  name: string;
  logo: string;
  alt: string;
  program?: string;
  extraClasses?: string;
};

const INVESTORS: readonly OrgLogoItem[] = [
  {
    name: "Golden Gate Ventures",
    logo: "/partners_logo/investors/golden-gate-ventures.png",
    alt: "Golden Gate Ventures",
  },
] as const;

const INCUBATED_BY: readonly OrgLogoItem[] = [
  {
    logo: "/partners_logo/incubation/ulaw.png",
    alt: "HCMC University of Law",
    program: "",
    name: "University of Law HCMC",
    extraClasses: "scale-150",
  },
  {
    logo: "/partners_logo/incubation/fulbright.png",
    alt: "Fulbright University Vietnam",
    name: "FulBright University - Center for Entrepreneurship and Innovation",
  },
  {
    logo: "/partners_logo/incubation/block71.avif",
    alt: "Block71",
    name: "Block71",
  },
] as const;

export function Investors() {
  const { t } = useI18n();
  const items = [...INVESTORS, ...INCUBATED_BY];

  return (
    <Section id="investors" spacing="compact" className="border-t border-gray-100/80 bg-white/40 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader
            title={t("investors_title")}
            subtitle={t("investors_subtitle")}
            margin="tight"
            highlightWord={t("investors_title_highlight")}
          />
          <div className="mx-auto mt-8 max-w-6xl sm:mt-10">
            <InfiniteMarquee
              durationSeconds={26}
              trackClassName="gap-6 pr-6 sm:gap-8 sm:pr-8"
              items={items.map((item) => (
                <div
                  key={`${item.name}-${item.logo}`}
                  className="w-[260px] flex flex-col items-center justify-center text-center"
                >
                  <div
                    className={[
                      "relative mb-4 flex h-14 w-full items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 dark:invert dark:hover:invert-0 sm:h-16",
                      item.extraClasses ?? "",
                    ].join(" ")}
                  >
                    <Image src={item.logo} alt={item.alt} width={220} height={90} className="max-h-full w-auto object-contain" loading="lazy" />
                  </div>
                  <p className="text-sm font-semibold text-foreground sm:text-base">{item.name}</p>
                  {item.program ? <p className="mt-2 text-sm font-semibold text-blue-600 sm:text-base">{item.program}</p> : null}
                </div>
              ))}
            />
          </div>
        </FadeInOnScroll>
      </div>
    </Section>
  );
}

