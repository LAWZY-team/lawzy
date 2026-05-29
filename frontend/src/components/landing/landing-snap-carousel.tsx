"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LandingSnapCarouselProps = {
  children: ReactNode[];
  className?: string;
  trackClassName?: string;
  itemClassName?: string;
  showDots?: boolean;
};

/**
 * Horizontal snap carousel — one slide per viewport width (mobile-friendly).
 */
export const LandingSnapCarousel = ({
  children,
  className,
  trackClassName,
  itemClassName,
  showDots = true,
}: LandingSnapCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = children.length;
  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const next = ((index % slideCount) + slideCount) % slideCount;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setActiveIndex(next);
  }, [slideCount]);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) {
      return;
    }
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(index, slideCount - 1));
  }, [slideCount]);
  const scrollPrev = useCallback(() => {
    scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);
  const scrollNext = useCallback(() => {
    scrollToIndex(activeIndex + 1);
  }, [activeIndex, scrollToIndex]);
  return (
    <div className={cn("relative group/carousel", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          trackClassName
        )}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className={cn("w-full shrink-0 snap-center snap-always", itemClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      {slideCount > 1 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous slide"
            className="absolute left-0 top-[42%] z-10 h-9 w-9 -translate-y-1/2 rounded-full border-stone-200/90 bg-white/95 shadow-md sm:h-10 sm:w-10"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5 text-stone-700" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next slide"
            className="absolute right-0 top-[42%] z-10 h-9 w-9 -translate-y-1/2 rounded-full border-stone-200/90 bg-white/95 shadow-md sm:h-10 sm:w-10"
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5 text-stone-700" />
          </Button>
          {showDots ? (
            <div className="mt-4 flex justify-center gap-2">
              {children.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === activeIndex ? "w-6 bg-stone-800" : "w-2 bg-stone-300 hover:bg-stone-400"
                  )}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
