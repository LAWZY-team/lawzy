"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useI18n } from "./language-provider";
import FadeInOnScroll from "./fade-in-on-scroll";
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
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % achievements.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + achievements.length) % achievements.length);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  });

  return (
    <section id="achievement" className="py-20 border-t border-gray-100 dark:border-gray-800 overflow-hidden relative">
      <div className="container mx-auto px-4">
        <FadeInOnScroll>
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("achievement_title")}</h2>
            <div className="relative w-full shadow-2xl rounded-2xl overflow-hidden group">
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div key={currentIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5 }} className="absolute inset-0 w-full h-full">
                    <Image src={achievements[currentIndex].image} alt={achievements[currentIndex].title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                  <Button variant="ghost" size="icon" className="pointer-events-auto bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full h-10 w-10 md:h-12 md:w-12" onClick={prevSlide}><ChevronLeft className="w-6 h-6" /></Button>
                  <Button variant="ghost" size="icon" className="pointer-events-auto bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full h-10 w-10 md:h-12 md:w-12" onClick={nextSlide}><ChevronRight className="w-6 h-6" /></Button>
                </div>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                  {achievements.map((_, index) => (
                    <button key={index} className={`w-2.5 h-2.5 rounded-full transition-colors ${index === currentIndex ? "bg-white" : "bg-white/50 hover:bg-white/80"}`} onClick={() => setCurrentIndex(index)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6 max-w-2xl min-h-[4rem]">
              <AnimatePresence mode="wait">
                <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <h3 className="text-2xl font-bold text-foreground leading-tight">{achievements[currentIndex].title}</h3>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </FadeInOnScroll>
      </div>
    </section>
  );
}
