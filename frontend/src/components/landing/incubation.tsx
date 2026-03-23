"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";
import { Section, SectionEyebrow, sectionContainer } from "./landing-section";

const INCUBATED_BY = [
  {
    logo: "/partners_logo/incubation/ulaw.png",
    alt: "HCMC University of Law",
    program: "",
    org: "University of Law HCMC",
    extraClasses: "scale-150",
  },
  {
    logo: "/partners_logo/incubation/fulbright.png",
    alt: "Fulbright University Vietnam",
    program: "OUTBOX Incubation Program 2025",
    org: "FulBright University - Center for Entrepreneurship and Innovation",
  },
  {
    logo: "/partners_logo/incubation/block71.avif",
    alt: "Block71",
    program: "Univenture Program 2026",
    org: "Block71",
  },
];

export function Incubation() {
  const { t } = useI18n();
  return (
    <Section spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <SectionEyebrow title={t("incubation_by")} className="mb-8 sm:mb-10 md:mb-12" />
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 md:gap-24">
          {INCUBATED_BY.map((item, index) => (
            <div key={index} className="flex max-w-[260px] flex-col items-center sm:max-w-[280px]">
              <div className={`relative mb-4 flex h-20 w-auto items-center justify-center sm:mb-6 sm:h-24 dark:invert ${item.extraClasses || ""}`}>
                <Image src={item.logo} alt={item.alt} height={90} width={220} className="h-auto max-h-full w-auto object-contain" loading="lazy" />
              </div>
              <div className="text-center">
                <p className="mb-1 text-sm font-medium text-foreground sm:mb-2 sm:text-base">{item.org}</p>
                {item.program ? <p className="text-sm font-semibold text-blue-600 sm:text-base">{item.program}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
