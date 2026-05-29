"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
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

const INVESTOR_ITEMS: readonly OrgLogoItem[] = [
  INCUBATED_BY[0],
  INVESTORS[0],
  INCUBATED_BY[1],
  INCUBATED_BY[2],
];

type InvestorCardProps = {
  item: OrgLogoItem;
};

const InvestorCard = ({ item }: InvestorCardProps) => (
  <div className="flex w-[240px] flex-col items-center justify-center text-center sm:w-[260px]">
    <div
      className={[
        "relative mb-4 flex h-14 w-full items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 sm:h-16",
        item.extraClasses ?? "",
      ].join(" ")}
    >
      <Image
        src={item.logo}
        alt={item.alt}
        width={220}
        height={90}
        className="max-h-full w-auto object-contain"
        loading="lazy"
      />
    </div>
    <p className="text-sm font-semibold text-foreground sm:text-base">{item.name}</p>
    {item.program ? (
      <p className="mt-2 text-sm font-semibold text-blue-600 sm:text-base">{item.program}</p>
    ) : null}
  </div>
);

export function Investors() {
  const { t } = useI18n();
  return (
    <Section id="investors" spacing="compact" className="bg-[#faf9f5]">
      <div className={sectionContainer}>
        <SectionHeader
          title={t("investors_title")}
          subtitle={t("investors_subtitle")}
          margin="tight"
          highlightWord={t("investors_title_highlight")}
          className="mt-4"
        />
        <div className="mx-auto mt-10 max-w-7xl sm:mt-12">
          <InfiniteMarquee
            durationSeconds={32}
            pauseOnHover
            trackClassName="gap-10 pr-10 sm:gap-12 sm:pr-12"
            items={INVESTOR_ITEMS.map((item) => (
              <InvestorCard key={`${item.name}-${item.logo}`} item={item} />
            ))}
          />
        </div>
      </div>
    </Section>
  );
}
