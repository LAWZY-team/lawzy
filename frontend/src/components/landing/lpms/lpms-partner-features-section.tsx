"use client";

import FadeInOnScroll from "../fade-in-on-scroll";
import { SectionHeader, sectionContainer } from "../landing-section";
import { useI18n } from "../language-provider";
import { FeatureCustomerBase } from "./feature-customer-base";
import { FeatureOperations } from "./feature-operations";
import { FeatureBrandWebsite } from "./feature-brand-website";
import { FeatureWebsitePricing } from "./feature-website-pricing";
import { FeatureJointMedia } from "./feature-joint-media";
import { FeatureProfessionalNetwork } from "./feature-professional-network";

export function LpmsPartnerFeaturesSection() {
  const { t } = useI18n();
  return (
    <>
      <section className="border-t border-gray-100/80 bg-[#faf9f5] py-12 sm:py-14">
        <FadeInOnScroll>
          <div className={sectionContainer}>
            <SectionHeader
              title={t("lpms_partner_features_title")}
              subtitle={t("lpms_partner_features_subtitle")}
              margin="default"
              highlightWord="LPMS"
            />
          </div>
        </FadeInOnScroll>
      </section>
      <FeatureOperations />
      <FeatureBrandWebsite />
      <FeatureWebsitePricing />
      <FeatureCustomerBase />
      <FeatureJointMedia />
      <FeatureProfessionalNetwork />
    </>
  );
}
