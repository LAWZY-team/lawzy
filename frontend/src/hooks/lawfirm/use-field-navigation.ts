"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LawfirmFieldSelection = {
  fieldId: string;
  occurrenceKey: string | null;
};

const escaped = (value: string) => CSS.escape(value);

export function useFieldNavigation(scopeKey: string) {
  const previewRef = useRef<HTMLDivElement>(null);
  const fieldListRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [selectionState, setSelectionState] = useState<{
    scopeKey: string;
    selection: LawfirmFieldSelection | null;
  }>({ scopeKey, selection: null });
  const selection = selectionState.scopeKey === scopeKey ? selectionState.selection : null;

  const schedule = useCallback((work: () => void) => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      work();
    });
  }, []);

  const scrollBehavior = useCallback((): ScrollBehavior => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }, []);

  const selectFromPreview = useCallback(
    (next: LawfirmFieldSelection) => {
      setSelectionState({ scopeKey, selection: next });
      schedule(() => {
        const card = fieldListRef.current?.querySelector<HTMLElement>(
          `[data-field-card="${escaped(next.fieldId)}"]`,
        );
        card?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      });
    },
    [schedule, scopeKey, scrollBehavior],
  );

  const selectFromPanel = useCallback(
    (next: LawfirmFieldSelection) => {
      setSelectionState({ scopeKey, selection: next });
      if (!next.occurrenceKey) return;
      schedule(() => {
        const occurrence = previewRef.current?.querySelector<HTMLElement>(
          `[data-occurrence-key="${escaped(next.occurrenceKey!)}"]`,
        );
        occurrence?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      });
    },
    [schedule, scopeKey, scrollBehavior],
  );

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return {
    previewRef,
    fieldListRef,
    selection,
    selectFromPreview,
    selectFromPanel,
  };
}
