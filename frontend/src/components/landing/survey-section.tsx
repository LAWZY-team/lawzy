"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "./language-provider";
import { Button } from "@/components/ui/button";

type SurveySectionProps = { isOpen: boolean; onClose: () => void };

export default function SurveySection({ isOpen, onClose }: SurveySectionProps) {
  const { t } = useI18n();
  const shouldLoadForm = isOpen;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKeyDown); };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="survey-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 25 }} className="relative w-full max-w-3xl md:max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100" role="dialog" aria-modal="true" aria-label={t("survey_modal_title")}>
            <div className="flex items-start justify-between p-1 border-b border-gray-100">
              <div />
              <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("survey_close")}><X className="w-5 h-5" /></Button>
            </div>
            <div className="bg-gray-50 px-3 pb-3 pt-2 md:px-4 md:pb-4">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                {shouldLoadForm ? (
                  <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSf7WcDEZmoQsZ2hmet2XAUc6H8KOV04LmHk32gyjiSY8GBtLA/viewform?embedded=true" title="Khảo sát" className="w-full h-[80vh] min-h-[420px] md:h-[55vh] md:min-h-[520px]" frameBorder="0" marginHeight={0} marginWidth={0} loading="lazy">Đang tải…</iframe>
                ) : (
                  <div className="flex h-[50vh] min-h-[360px] md:min-h-[520px] items-center justify-center text-gray-500 text-sm">{t("survey_loading")}</div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
