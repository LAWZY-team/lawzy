"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "./language-provider";
import { sectionContainer } from "./landing-section";
import { Facebook, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";

export function LandingFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const productLinks = [
    { href: "#features", label: t("footer_link_features") },
    { href: "#pricing", label: t("footer_link_pricing") },
    { href: "#cost", label: t("footer_link_cost") },
    { href: "#target", label: t("footer_link_audience") },
    { href: "#newspaper", label: t("footer_link_press") },
    { href: "#achievement", label: t("footer_link_achievements") },
  ] as const;

  const legalLinks = [
    { href: "/privacy-policy", label: t("footer_privacy") },
    { href: "/term", label: t("footer_terms") },
  ] as const;

  return (
    <footer id="contact" className="border-t border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className={sectionContainer}>
        <div className="grid gap-10 py-12 sm:gap-12 sm:py-14 lg:grid-cols-12 lg:gap-10 lg:py-20">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              <Image src="/lawzy-logo-white.png" alt="Lawzy" width={132} height={132} className="h-10 w-auto object-contain sm:h-11 md:h-12" loading="lazy" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:mt-4">{t("footer_tagline")}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:mt-3">{t("footer_description")}</p>
            <div className="mt-5 flex items-center gap-2 sm:mt-6 sm:gap-3">
              <a
                href="https://www.facebook.com/lawzy.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:border-orange-500/50 hover:text-orange-400 sm:h-10 sm:w-10"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.youtube.com/@Lawzy-vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:border-orange-500/50 hover:text-orange-400 sm:h-10 sm:w-10"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/lawzy-vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 transition-colors hover:border-orange-500/50 hover:text-orange-400 sm:h-10 sm:w-10"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("footer_column_product")}</h3>
            <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-sm text-zinc-300 transition-colors hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-sm text-zinc-300 transition-colors hover:text-white">
                  {t("login")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-zinc-300 transition-colors hover:text-white">
                  {t("footer_register")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("footer_column_legal")}</h3>
            <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
              {legalLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-zinc-300 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("footer_contact")}</h3>
            <Link href="/contact" className="mt-3 inline-block text-sm font-medium text-orange-400 hover:text-orange-300 sm:mt-4">
              {t("contact_sales")}
            </Link>
            <ul className="mt-3 space-y-3 text-sm text-zinc-400 sm:space-y-4">
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-500/90" aria-hidden />
                <a href="mailto:contact@lawzy.vn" className="break-all text-zinc-300 hover:text-white">
                  contact@lawzy.vn
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-orange-500/90" aria-hidden />
                <a href="tel:+84908716707" className="text-zinc-300 hover:text-white">
                  +84 908 716 707
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500/90" aria-hidden />
                <span className="text-zinc-300">{t("footer_address")}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-6">
          <p className="text-center text-xs text-zinc-500 sm:text-left">
            © {year} Lawzy. {t("footer_rights")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500 sm:justify-end sm:gap-x-6">
            {legalLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-zinc-300">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
