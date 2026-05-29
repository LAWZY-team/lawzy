"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
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
    logo: "/partners_logo/incubation/block71.avif",
    alt: "Block71",
    name: "Block71",
  },
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
] as const;

export function Investors() {
  const { t } = useI18n();
  const items = [
    INCUBATED_BY[0],
    INVESTORS[0],
    INCUBATED_BY[1],
    INCUBATED_BY[2],
  ];
  return (
    <Section id="investors" spacing="compact" className="bg-[#faf9f5]">
      <div className={sectionContainer}>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.22em]">
          {t("hero_trust")}
        </p>
        <SectionHeader
          title={t("investors_title")}
          subtitle={t("investors_subtitle")}
          margin="tight"
          highlightWord={t("investors_title_highlight")}
          className="mt-4"
        />
        <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-start justify-center gap-x-10 gap-y-10 sm:mt-12 sm:gap-x-14 md:gap-x-16">
          {items.map((item) => (
            <div
              key={`${item.name}-${item.logo}`}
              className="flex w-[200px] flex-col items-center justify-center text-center sm:w-[220px]"
            >
              <div
                className={[
                  "relative mb-4 flex h-14 w-full items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 sm:h-16",
                  item.extraClasses ?? "",
                ].join(" ")}
              >
                <Image src={item.logo} alt={item.alt} width={220} height={90} className="max-h-full w-auto object-contain" loading="lazy" />
              </div>
              <p className="text-sm font-semibold text-foreground sm:text-base">{item.name}</p>
              {item.program ? <p className="mt-2 text-sm font-semibold text-blue-600 sm:text-base">{item.program}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
