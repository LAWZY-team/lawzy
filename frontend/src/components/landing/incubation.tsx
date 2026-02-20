"use client";

import Image from "next/image";
import { useI18n } from "./language-provider";

const INCUBATED_BY = [
  { logo: "/partners_logo/incubation/ulaw.png", alt: "HCMC University of Law", program: "", org: "University of Law HCMC", extraClasses: "scale-150" },
  { logo: "/partners_logo/incubation/fulbright.png", alt: "Fulbright University Vietnam", program: "OUTBOX Incubation Program 2025", org: "FulBright University - Center for Entrepreneurship and Innovation" },
  { logo: "/partners_logo/incubation/block71.avif", alt: "Block71", program: "Univenture Program 2026", org: "Block71" },
];

export function Incubation() {
  const { t } = useI18n();
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-10">{t("incubation_by")}</h3>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            {INCUBATED_BY.map((item, index) => (
              <div key={index} className="flex flex-col items-center max-w-[280px]">
                <div className={`h-24 w-auto relative mb-6 flex items-center justify-center dark:invert ${item.extraClasses || ""}`}>
                  <Image src={item.logo} alt={item.alt} height={90} width={220} className="object-contain max-h-full w-auto" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground text-base mb-2">{item.org}</p>
                  <p className="text-blue-600 font-semibold text-base">{item.program}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
