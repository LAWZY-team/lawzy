"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "./language-provider";
import { Menu, X, LogIn, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

type HeaderProps = {
  onOpenSurvey?: () => void;
};

export default function LandingHeader({ onOpenSurvey }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as EventListener);
    return () => mq.removeEventListener("change", handler as EventListener);
  }, []);

  const navLinks = [
    { href: "#newspaper", label: t("nav_newspaper") },
    { href: "#features", label: t("nav_features") },
    { href: "#target", label: t("nav_target") },
    { href: "#achievement", label: t("nav_achievement") },
    { href: "#team", label: t("nav_team") },
    { href: "#contact", label: t("nav_contact") },
  ];

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <>
      <div
        className={`fixed z-50 transition-all duration-300
          left-4 right-4 top-4 rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-100 dark:border-gray-800 shadow-sm
          md:left-0 md:right-0 md:top-0 md:w-full md:rounded-none md:border-t-0 md:border-x-0
          ${isScrolled ? "md:bg-white/90 md:dark:bg-gray-900/90 md:backdrop-blur-md md:border-b md:border-gray-100 md:dark:border-gray-800 md:shadow-sm" : "md:bg-transparent md:dark:bg-transparent md:border-transparent md:shadow-none"}`}
      >
        <div className="container mx-auto px-4 py-1 flex justify-between items-center min-h-[60px] md:min-h-[72px] relative">
          <a href="#" className="flex-shrink-0 z-50 relative">
            <Image src="/lawzy-logo.png" alt="Lawzy Logo" width={100} height={100} className="scale-130 dark:invert" priority />
          </a>

          <div className="hidden md:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 space-x-8 items-center">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-gray-600 dark:text-gray-300 hover:text-foreground hover:font-semibold transition-all font-medium text-sm lg:text-base">
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <AnimatePresence>
                {isScrolled && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="overflow-hidden">
                    <div className="pr-2">
                      <Button type="button" className="bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black h-9 rounded-full shadow-md whitespace-nowrap" onClick={onOpenSurvey}>
                        {t("try_free")}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            <Button variant="outline" size="sm" className="hidden md:inline-flex border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 h-9" asChild>
              <Link href="/login">
                <LogIn className="w-4 h-4 mr-1.5" />
                {t("login")}
              </Link>
            </Button>

            <Button variant="outline" className="hidden md:inline-flex px-3 py-1 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 h-9" onClick={() => setLocale(locale === "vi" ? "en" : "vi")}>
              {locale === "vi" ? t("language_vietnamese") : t("language_english")}
            </Button>

            {mounted && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}

            <div className="flex items-center gap-4 md:hidden z-50">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 top-[80px] z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 md:hidden flex flex-col p-6 space-y-6 shadow-xl">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-2xl font-semibold text-foreground hover:text-orange-600 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 w-full space-y-4">
              <Button variant="outline" className="w-full justify-start text-lg h-12" asChild>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <LogIn className="w-5 h-5 mr-2" />
                  {t("login")}
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-lg h-12" onClick={() => { setLocale(locale === "vi" ? "en" : "vi"); setIsMobileMenuOpen(false); }}>
                {locale === "vi" ? t("language_vietnamese") : t("language_english")}
              </Button>
              <Button className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black text-lg h-12 rounded-xl" onClick={() => { setIsMobileMenuOpen(false); onOpenSurvey?.(); }}>
                {t("try_free")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
