"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "./language-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LandingHeader() {
  const { t } = useI18n();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    // { href: "/pricing", label: t("nav_pricing") },
    { href: "/news", label: t("footer_link_news") },
    { href: "/contact", label: t("nav_contact") },
  ];

  const productLinks = [
    { href: "/products/clm", label: t("nav_product_clm"), shortLabel: "CLM" },
    { href: "/products/lpms", label: t("nav_product_lpms"), shortLabel: "LPMS" },
  ] as const;

  return (
    <>
      <header
        className={`fixed z-50 transition-all duration-300
          left-3 right-3 top-3 max-w-[100vw] rounded-2xl border border-gray-100/90 bg-white/90 shadow-sm shadow-black/[0.03] backdrop-blur-xl backdrop-saturate-150
          sm:left-4 sm:right-4 sm:top-4 sm:rounded-3xl
          md:left-0 md:right-0 md:top-0 md:max-w-none md:w-full md:rounded-none md:border-x-0 md:border-t-0
          ${isScrolled ? "md:border-b md:border-gray-100/95 md:bg-white/95 md:shadow-sm md:shadow-black/[0.04] md:backdrop-blur-xl" : "md:border-transparent md:bg-transparent md:shadow-none"}`}
      >
        <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-5 lg:px-8">
          <div className="flex min-h-[48px] w-full items-center gap-2 py-1 sm:min-h-[52px] md:min-h-[60px] md:gap-3 md:py-0.5">
            <Link href="/" className="shrink-0 flex items-center min-w-0" aria-label="Lawzy home">
              <Image src="/lawzy-logo.png" alt="" width={88} height={88} className="h-11 w-auto sm:h-12 md:h-14 object-contain object-left" priority />
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex lg:gap-6" aria-label="Main">
              <div
                ref={productsRef}
                className="relative"
                onMouseEnter={() => setIsProductsOpen(true)}
                onMouseLeave={() => setIsProductsOpen(false)}
              >
                <button
                  type="button"
                  className={cn(
                    "group relative flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:text-[0.9375rem]",
                    isProductsOpen ? "bg-gray-100 text-foreground" : "text-gray-600 hover:text-foreground"
                  )}
                  aria-expanded={isProductsOpen}
                  aria-haspopup="true"
                >
                  {t("nav_products")}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isProductsOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {isProductsOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-1/2 top-full z-50 mt-1.5 w-52 -translate-x-1/2 rounded-xl border border-gray-200/90 bg-white p-2 shadow-lg shadow-black/[0.08]"
                    >
                      <div className="flex flex-col gap-0.5">
                        {productLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-lg px-2.5 py-2 text-foreground transition-colors hover:bg-gray-50"
                          >
                            <span className="block text-sm font-semibold">{link.shortLabel}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative whitespace-nowrap px-1 py-1 text-sm font-medium text-gray-600 transition-colors hover:text-foreground lg:text-[0.9375rem]"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-0 max-w-[calc(100%-4px)] -translate-x-1/2 rounded-full bg-orange-500 transition-all duration-300 ease-out group-hover:w-full" />
                </Link>
              ))}
            </nav>

            <div className="flex items-center justify-end gap-3 sm:gap-4 shrink-0 ml-auto md:ml-0">


              <div className="hidden sm:block">
                <LocaleSwitcher />
              </div>

              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 shrink-0" aria-expanded={isMobileMenuOpen} aria-controls="landing-mobile-nav" onClick={() => setIsMobileMenuOpen((o) => !o)}>
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              id="landing-mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label={t("nav_menu")}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="relative mx-3 sm:mx-4 mt-[calc(3rem+1rem)] sm:mt-[calc(3.25rem+1rem)] rounded-2xl border border-gray-100 bg-white shadow-lg max-h-[min(70vh,calc(100dvh-6rem))] overflow-y-auto"
            >
              <div className="flex flex-col p-4 sm:p-5 gap-1">
                <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("nav_products")}</p>
                {productLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-base font-semibold text-foreground hover:text-orange-600 transition-colors py-3 px-2 rounded-lg hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.shortLabel} — {link.label}
                  </Link>
                ))}
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-semibold text-foreground hover:text-orange-600 transition-colors py-3 px-2 rounded-lg hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                <div className="pt-3 mt-2 border-t border-gray-100 sm:hidden">
                  <div onClick={() => setIsMobileMenuOpen(false)} className="px-2">
                    <LocaleSwitcher className="w-full justify-start h-11 text-base" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
