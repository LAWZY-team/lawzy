"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type InfiniteMarqueeProps = {
  items: readonly ReactNode[];
  className?: string;
  trackClassName?: string;
  /** Seconds */
  durationSeconds?: number;
  /** Default: false (continuous) */
  pauseOnHover?: boolean;
  /** Default: left */
  direction?: "left" | "right";
};

export function InfiniteMarquee({
  items,
  className,
  trackClassName,
  durationSeconds = 28,
  pauseOnHover = false,
  direction = "left",
}: InfiniteMarqueeProps) {
  // Duplicate once so the animation can loop seamlessly.
  const loopItems = [...items, ...items];

  return (
    <div
      className={cn("lawzy-marquee", pauseOnHover && "lawzy-marquee--pause-on-hover", className)}
      style={
        {
          ["--marquee-duration" as never]: `${durationSeconds}s`,
          ["--marquee-direction" as never]: direction === "left" ? "normal" : "reverse",
        } as never
      }
    >
      <div className={cn("lawzy-marquee__track", trackClassName)}>
        {loopItems.map((node, idx) => (
          <div key={idx} className="lawzy-marquee__item">
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

