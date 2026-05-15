"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import type { ReactNode } from "react";

export default function FadeInOnScroll({
  children,
  delay = 0.1,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 32 };
  const animate = inView ? (prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }) : {};
  const transition = prefersReducedMotion ? { duration: 0.2, delay } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay };

  return (
    <motion.div ref={ref} className="overflow-visible" initial={initial} animate={animate} transition={transition}>
      {children}
    </motion.div>
  );
}
