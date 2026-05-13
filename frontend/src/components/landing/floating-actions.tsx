"use client";

import { useState, useEffect } from "react";
import { useI18n } from "./language-provider";
import { useContactModal } from "./contact-modal";
import { ChevronUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingActions() {
  const { t } = useI18n();
  const { open } = useContactModal();
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const fn = () => setShowBackTop(window.scrollY > 600);
    fn();
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed right-3 bottom-6 z-50 flex flex-col gap-2 sm:right-4 sm:bottom-8 md:right-6 md:bottom-10">
      {showBackTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={t("floating_back_to_top")}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-foreground shadow-lg shadow-black/[0.08] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900/95 dark:hover:border-orange-600/40 dark:hover:bg-orange-950/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          )}
        >
          <ChevronUp className="h-5 w-5 text-foreground" />
        </button>
      )}
      <button
        type="button"
        onClick={open}
        aria-label={t("floating_book_demo")}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-900/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-900/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        )}
      >
        <Calendar className="h-5 w-5" />
      </button>
    </div>
  );
}
