"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { SectionCta } from "./section-cta";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Achievement() {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const achievements = [
    { id: 1, image: "/achievements/top10.jpg", title: "TOP 10 BEST TEAMS UNIVENTURE 2025" },
    { id: 2, image: "/achievements/1.jpg", title: t("achievement_item_title") },
  ];
  const nextSlide = useCallback(() => setCurrentIndex((prev) => (prev + 1) % achievements.length), [achievements.length]);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + achievements.length) % achievements.length);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <Section id="achievement" spacing="relaxed" className="relative overflow-hidden border-t border-gray-100 dark:border-gray-800">
      <div className={sectionContainer}>
        <FadeInOnScroll>
          <div className="mx-auto flex max-w-4xl flex-col items-center space-y-8 sm:space-y-10 text-center">
            <SectionHeader title={t("achievement_title")} margin="default" highlightWord={t("achievement_title_highlight")} />
            <div className="relative w-full group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 h-full w-full"
                  >
                    <Image
                      src={achievements[currentIndex].image}
                      alt={achievements[currentIndex].title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(min-width: 768px) 896px, 100vw"
                      loading="lazy"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-3 sm:p-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto h-9 w-9 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 sm:h-10 sm:w-10 md:h-12 md:w-12"
                    onClick={prevSlide}
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto h-9 w-9 rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/40 sm:h-10 sm:w-10 md:h-12 md:w-12"
                    onClick={nextSlide}
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>
                <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 transform space-x-2 sm:bottom-4">
                  {achievements.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Slide ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors sm:h-2.5 sm:w-2.5 ${index === currentIndex ? "bg-white" : "bg-white/50 hover:bg-white/80"}`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="min-h-[3.5rem] max-w-2xl space-y-6 sm:min-h-[4rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{achievements[currentIndex].title}</h3>
                </motion.div>
              </AnimatePresence>
            </div>
            <SectionCta hint={t("hero_cta_hint")} />
          </div>
        </FadeInOnScroll>
      </div>
    </Section>
  );
}
