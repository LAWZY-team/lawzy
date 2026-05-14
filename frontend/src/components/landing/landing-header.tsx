"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "./language-provider";
import { LocaleSwitcher } from "./locale-switcher";
import { useAuthStore } from "@/stores/auth-store";
import { Menu, X, LogIn, LayoutDashboard, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingHeader() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isAuthenticated, authResolved, fetchUser, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authResolved) fetchUser();
  }, [authResolved, fetchUser]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /**/
    }
    logout();
    router.push("/");
  };

  const navLinks = [
    { href: "/pricing", label: t("nav_pricing") },
    { href: "/news", label: t("footer_link_news") },
    { href: "/contact", label: t("nav_contact") },
  ];

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
              <Image src="/lawzy-logo.png" alt="LAWZY — trang chủ" width={88} height={88} className="h-11 w-auto sm:h-12 md:h-14 object-contain object-left" priority />
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex lg:gap-10" aria-label="Main">
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
              {authResolved && isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 border-gray-300 hover:bg-gray-50 text-sm gap-2">
                      <span className="truncate max-w-[120px]">{user?.name ?? t("nav_user")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t("nav_dashboard")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <User className="mr-2 h-4 w-4" />
                        {t("settings_title")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("auth_logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                null /*
                <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 border-gray-300 hover:bg-gray-50 text-sm" asChild>
                  <Link href="/login">
                    <LogIn className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>{t("login")}</span>
                  </Link>
                </Button>
                */
              )}

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
                {authResolved && isAuthenticated ? (
                  <div className="pt-3 mt-2 border-t border-gray-100 flex flex-col gap-1">
                    <Link
                      href="/dashboard"
                      className="text-lg font-semibold text-foreground hover:text-orange-600 transition-colors py-3 px-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      {t("nav_dashboard")}
                    </Link>
                    <Link
                      href="/settings"
                      className="text-lg font-semibold text-foreground hover:text-orange-600 transition-colors py-3 px-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      {t("settings_title")}
                    </Link>
                    <button
                      type="button"
                      className="text-lg font-semibold text-foreground hover:text-orange-600 transition-colors py-3 px-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 w-full text-left"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      {t("auth_logout")}
                    </button>
                  </div>
                ) : (
                  null /*
                  <Link
                    href="/login"
                    className="pt-3 mt-2 border-t border-gray-100 text-lg font-semibold text-orange-600 hover:text-orange-700 py-3 px-2 rounded-lg hover:bg-orange-50 flex items-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="h-5 w-5" />
                    {t("login")}
                  </Link>
                  */
                )}
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
