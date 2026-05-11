"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BriefcaseBusiness, FileText } from "lucide-react";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { useI18n } from "./language-provider";
import { Button } from "@/components/ui/button";

type ProductCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  audience: string;
  href: string;
  ctaLabel: string;
};

const ProductCard = ({ icon: Icon, title, description, audience, href, ctaLabel }: ProductCardProps) => {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 sm:p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/30">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-medium text-foreground/80">{audience}</p>
      <Button asChild className="mt-6 w-fit gap-2">
        <Link href={href}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

export default function ProductOverviewSection() {
  const { t } = useI18n();
  const products = [
    {
      icon: FileText,
      title: t("product_clm_title"),
      description: t("product_clm_description"),
      audience: t("product_clm_audience"),
      href: "/products/clm",
      ctaLabel: t("product_cta"),
    },
    {
      icon: BriefcaseBusiness,
      title: t("product_lpms_title"),
      description: t("product_lpms_description"),
      audience: t("product_lpms_audience"),
      href: "/products/lpms",
      ctaLabel: t("product_cta"),
    },
  ] as const;
  return (
    <Section id="products" spacing="compact" className="border-t border-gray-100/80 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <SectionHeader title={t("products_title")} subtitle={t("products_subtitle")} margin="tight" />
        </FadeInOnScroll>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {products.map((product, index) => (
            <FadeInOnScroll key={product.href} delay={index * 0.08}>
              <ProductCard
                icon={product.icon}
                title={product.title}
                description={product.description}
                audience={product.audience}
                href={product.href}
                ctaLabel={product.ctaLabel}
              />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </Section>
  );
}
