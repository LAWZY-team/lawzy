"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import type { ReactNode } from "react";

/** Opacity-only reveal — avoids transform clipping bugs with animated marquees. */
export function LpmsFadeIn({
  children,
  delay = 0.1,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.08 });
  const initial = { opacity: 0 };
  const animate = inView ? { opacity: 1 } : { opacity: 0 };
  const transition = prefersReducedMotion ? { duration: 0.2, delay } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay };

  return (
    <motion.div ref={ref} className={cn("relative overflow-clip", className)} initial={initial} animate={animate} transition={transition}>
      {children}
    </motion.div>
  );
}
