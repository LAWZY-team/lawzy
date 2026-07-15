"use client";

import Image from "next/image";
import { useI18n } from "../language-provider";
import { LpmsFeatureShell } from "./lpms-feature-shell";

type BrandWebsiteClient = {
  name: string;
  logoSrc: string;
  websiteUrl: string;
};

const BRAND_WEBSITE_CLIENTS: BrandWebsiteClient[] = [
  {
    name: "VietCounsel",
    logoSrc: "/partners_logo/clients/vietcounsel.png",
    websiteUrl: "https://nhatluat.vn",
  },
];

export function FeatureBrandWebsite() {
  const { t } = useI18n();

  const points = [t("lpms_partner_f3_design"), t("lpms_partner_f3_support")];

  return (
    <LpmsFeatureShell index={1} title={t("lpms_partner_f3_title")}>
      <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
        {points.map((text, i) => (
          <p
            key={i}
            className="text-base leading-relaxed text-muted-foreground sm:text-lg md:border-l md:border-gray-200 md:pl-8 first:md:border-l-0 first:md:pl-0"
          >
            {text}
          </p>
        ))}
      </div>

      <div className="mt-10 border-t border-gray-200/80 pt-8 sm:mt-12 sm:pt-10">
        <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {t("lpms_partner_f3_clients_title")}
        </h3>
        <ul className="mt-5 flex flex-wrap items-center gap-6 sm:gap-8">
          {BRAND_WEBSITE_CLIENTS.map((client) => (
            <li key={client.websiteUrl}>
              <a
                href={client.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={client.name}
                className="block opacity-90 transition-opacity duration-200 hover:opacity-100"
              >
                <Image
                  src={client.logoSrc}
                  alt={client.name}
                  width={256}
                  height={256}
                  sizes="(max-width: 640px) 160px, 192px"
                  loading="lazy"
                  className="h-32 w-32 object-contain sm:h-40 sm:w-40 md:h-48 md:w-48"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </LpmsFeatureShell>
  );
}
