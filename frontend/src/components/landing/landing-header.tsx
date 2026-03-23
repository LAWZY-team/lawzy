"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "./language-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { Menu, X, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingHeader() {
  const { t } = useI18n();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: t("nav_features") },
    { href: "#pricing", label: t("nav_pricing") },
    { href: "#target", label: t("nav_target") },
    { href: "#achievement", label: t("nav_achievement") },
    { href: "/contact", label: t("nav_contact") },
  ];

  return (
    <>
      <header
        className={`fixed z-50 transition-all duration-300
          left-3 right-3 top-3 max-w-[100vw] rounded-2xl bg-white/95 backdrop-blur-md border border-gray-100/80 shadow-sm
          sm:left-4 sm:right-4 sm:top-4 sm:rounded-3xl
          md:left-0 md:right-0 md:top-0 md:max-w-none md:w-full md:rounded-none md:border-x-0 md:border-t-0
          ${isScrolled ? "md:bg-white/95 md:backdrop-blur-md md:border-b md:border-gray-100 md:shadow-sm" : "md:bg-transparent md:border-transparent md:shadow-none"}`}
      >
        <div className="container mx-auto px-3 sm:px-4 md:px-4 lg:px-6">
          <div className="flex w-full items-center min-h-[48px] sm:min-h-[52px] md:min-h-[60px] py-1 md:py-0.5 gap-2">
            <Link href="/" className="shrink-0 flex items-center min-w-0" aria-label="Lawzy home">
              <Image src="/lawzy-logo.png" alt="" width={88} height={88} className="h-11 w-auto sm:h-12 md:h-14 object-contain object-left" priority />
            </Link>

            <nav className="hidden md:flex flex-1 justify-center items-center gap-4 lg:gap-8 min-w-0" aria-label="Main">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-foreground hover:font-semibold transition-all font-medium text-sm lg:text-base whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center justify-end gap-3 sm:gap-4 shrink-0 ml-auto md:ml-0">
              <Link
                href="/privacy-policy"
                className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer_privacy")}
              </Link>
              <Link
                href="/term"
                className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer_terms")}
              </Link>
              <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 border-gray-300 hover:bg-gray-50 text-sm" asChild>
                <Link href="/login">
                  <LogIn className="w-4 h-4 mr-1.5 shrink-0" />
                  <span>{t("login")}</span>
                </Link>
              </Button>

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
                <div className="flex flex-wrap gap-4 pt-3 mt-2 border-t border-gray-100">
                  <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                    {t("footer_privacy")}
                  </Link>
                  <Link href="/term" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                    {t("footer_terms")}
                  </Link>
                </div>
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
