"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  CLM_LPMS_JOURNEY,
  type JourneySideKeys,
} from "@/lib/landing/clm-lpms-journey";
import { cn } from "@/lib/utils";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";

const SECTION_TITLE_ID = "clm-lpms-journey-title";
const STAGE_AUTOPLAY_INTERVAL_MS = 5000;
const STAGE_READING_INTERVAL_MS = 10000;

type JourneySideCardProps = {
  cardId: string;
  badge: string;
  headline: string;
  summary: string;
  expanded: string;
  outcome: string;
  expandMore: string;
  expandLess: string;
  isOpen: boolean;
  onToggle: () => void;
  accent: "clm" | "lpms";
};

const JourneySideCard = ({
  cardId,
  badge,
  headline,
  summary,
  expanded,
  outcome,
  expandMore,
  expandLess,
  isOpen,
  onToggle,
  accent,
}: JourneySideCardProps) => {
  const detailsId = `${cardId}-details`;
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
        accent === "clm" ? "border-orange-100" : "border-stone-200/90",
      )}
    >
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.14em]",
          "text-stone-600",
        )}
      >
        {badge}
      </p>
      <h4 className="mt-2 text-base font-semibold leading-snug text-foreground">
        {headline}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {summary}
      </p>
      <div
        id={detailsId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            {expanded}
          </p>
          <p className="mt-4 border-l-2 border-orange-400/70 pl-3 text-sm leading-relaxed text-muted-foreground italic">
            {outcome}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={detailsId}
        className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        {isOpen ? expandLess : expandMore}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden />
        )}
      </button>
    </article>
  );
};

type SideCardFromKeysProps = {
  stageId: string;
  side: "clm" | "lpms";
  keys: JourneySideKeys;
  openSet: Set<string>;
  toggle: (key: string) => void;
  expandMore: string;
  expandLess: string;
  t: (key: string) => string;
};

const SideCardFromKeys = ({
  stageId,
  side,
  keys,
  openSet,
  toggle,
  expandMore,
  expandLess,
  t,
}: SideCardFromKeysProps) => {
  const cardKey = `${stageId}-${side}`;
  return (
    <JourneySideCard
      cardId={cardKey}
      badge={t(keys.badgeKey)}
      headline={t(keys.headlineKey)}
      summary={t(keys.summaryKey)}
      expanded={t(keys.expandedKey)}
      outcome={t(keys.outcomeKey)}
      expandMore={expandMore}
      expandLess={expandLess}
      isOpen={openSet.has(cardKey)}
      onToggle={() => toggle(cardKey)}
      accent={side}
    />
  );
};

export function ClmLpmsJourneySection() {
  const { t } = useI18n();
  const stagesHeadingId = useId();
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [openCards, setOpenCards] = useState<Set<string>>(() => new Set());
  const [autoplayDelayMs, setAutoplayDelayMs] = useState(
    STAGE_AUTOPLAY_INTERVAL_MS,
  );
  const [autoplayResetCount, setAutoplayResetCount] = useState(0);
  const activeStage = CLM_LPMS_JOURNEY.stages[activeStageIndex];
  const toggleCard = useCallback((key: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setAutoplayDelayMs(STAGE_READING_INTERVAL_MS);
    setAutoplayResetCount((count) => count + 1);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveStageIndex(
        (current) => (current + 1) % CLM_LPMS_JOURNEY.stages.length,
      );
      setAutoplayDelayMs(STAGE_AUTOPLAY_INTERVAL_MS);
    }, autoplayDelayMs);
    return () => window.clearTimeout(timer);
  }, [activeStageIndex, autoplayDelayMs, autoplayResetCount]);
  const expandMore = t(CLM_LPMS_JOURNEY.expandMoreKey);
  const expandLess = t(CLM_LPMS_JOURNEY.expandLessKey);
  return (
    <Section
      id="clm-lpms-journey"
      spacing="compact"
      className="border-t border-stone-200/60 bg-[#faf9f5]"
      aria-labelledby={SECTION_TITLE_ID}
    >
      <div className={sectionContainer}>
        <SectionHeader
          title={t(CLM_LPMS_JOURNEY.sectionTitleKey)}
          // subtitle={t(CLM_LPMS_JOURNEY.sectionSubtitleKey)}
          highlightWord={t(CLM_LPMS_JOURNEY.sectionHighlightKey)}
          titleId={SECTION_TITLE_ID}
          align="center"
          margin="tight"
        />
        <div className="mt-10 rounded-[2rem] border border-stone-200/70 bg-white/35 p-4 shadow-sm sm:p-6 lg:p-8">
          <h3
            id={stagesHeadingId}
            className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
            {t(CLM_LPMS_JOURNEY.stagesTitleKey)}
          </h3>
          <div className="mt-6 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm md:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                {activeStage.stageKey}
              </span>
              <h3 className="text-base font-bold leading-snug text-foreground">
                {t(activeStage.displayTitleKey)}
              </h3>
            </div>
            <div className="mt-4 flex items-center gap-2" aria-hidden>
              {CLM_LPMS_JOURNEY.stages.map((stage, index) => (
                <span
                  key={stage.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    activeStageIndex === index
                      ? "w-8 bg-orange-600"
                      : "w-1.5 bg-stone-200",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="mt-6 hidden gap-2 rounded-2xl border border-stone-200/80 bg-white p-2 shadow-sm md:grid md:grid-cols-4">
            {CLM_LPMS_JOURNEY.stages.map((stage, index) => {
              const isActive = activeStageIndex === index;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageIndex(index)}
                  onMouseEnter={() => setActiveStageIndex(index)}
                  onFocus={() => setActiveStageIndex(index)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                    isActive
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-stone-50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isActive
                        ? "bg-white text-orange-600"
                        : "bg-stone-100 text-stone-600",
                    )}
                  >
                    {stage.stageKey}
                  </span>
                  <span className="text-sm font-semibold leading-snug">
                    {t(stage.displayTitleKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            className="mt-6 grid gap-4 md:grid-cols-2 md:items-start"
            aria-labelledby={stagesHeadingId}
          >
            <SideCardFromKeys
              stageId={activeStage.id}
              side="clm"
              keys={activeStage.clm}
              openSet={openCards}
              toggle={toggleCard}
              expandMore={expandMore}
              expandLess={expandLess}
              t={t}
            />
            <SideCardFromKeys
              stageId={activeStage.id}
              side="lpms"
              keys={activeStage.lpms}
              openSet={openCards}
              toggle={toggleCard}
              expandMore={expandMore}
              expandLess={expandLess}
              t={t}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

export default ClmLpmsJourneySection;
