import { useEffect, useRef, useState } from "react";

/**
 * Smoothly interpolates toward `target` — tuned for live slider feedback (&lt;100ms).
 */
export const useFastAnimatedNumber = (target: number, durationMs = 100): number => {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      return;
    }
    let cancelled = false;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) {
        return;
      }
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, durationMs]);
  return display;
};
