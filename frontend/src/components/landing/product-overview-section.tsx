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
    <div className="group flex h-full flex-col rounded-3xl border border-gray-100/90 bg-white/90 p-6 shadow-sm shadow-black/[0.03] ring-1 ring-black/[0.04] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-100/80 hover:shadow-xl hover:shadow-orange-900/[0.06] hover:ring-orange-200/30 dark:border-gray-800 dark:bg-gray-900/90 dark:ring-white/[0.06] sm:p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-inner shadow-orange-100/50 dark:bg-orange-900/30">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h3>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
      <p className="mt-3 text-sm font-medium text-foreground/85">{audience}</p>
      <Button asChild className="mt-7 w-fit gap-2 shadow-sm shadow-orange-900/10 transition-transform group-hover:translate-x-0.5">
        <Link href={href}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
        <div className="mt-10 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-2 md:gap-8 lg:gap-10">
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
