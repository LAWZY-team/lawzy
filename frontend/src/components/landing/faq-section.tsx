"use client";

import { useCallback, useState } from "react";
import { Plus, X } from "lucide-react";
import { useI18n } from "./language-provider";
import { Section, SectionHeader, sectionContainer } from "./landing-section";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  { questionKey: "faq_q1", answerKey: "faq_a1" },
  { questionKey: "faq_q2", answerKey: "faq_a2" },
  { questionKey: "faq_q3", answerKey: "faq_a3" },
  { questionKey: "faq_q4", answerKey: "faq_a4" },
  { questionKey: "faq_q5", answerKey: "faq_a5" },
] as const;

type FaqItemProps = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};

const FaqItem = ({ question, answer, isOpen, onToggle }: FaqItemProps) => (
  <div className="border-b border-gray-200/90">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-4 py-5 text-left"
    >
      <span className="text-base font-semibold text-foreground sm:text-lg">{question}</span>
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        {isOpen ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </span>
    </button>
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="overflow-hidden">
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">{answer}</p>
      </div>
    </div>
  </div>
);

export default function FaqSection() {
  const { t } = useI18n();
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set());
  const toggleItem = useCallback((index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);
  return (
    <Section id="faq" spacing="compact" className="border-t border-gray-100/80 bg-white/50">
      <div className={sectionContainer}>
        <SectionHeader title={t("faq_title")} subtitle={t("faq_subtitle")} margin="tight" align="left" className="mx-0 max-w-3xl" />
        <div className="mx-auto mt-10 max-w-3xl border-t border-gray-200/90">
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem
              key={item.questionKey}
              question={t(item.questionKey)}
              answer={t(item.answerKey)}
              isOpen={openIndices.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
