"use client";

import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Clock, CheckCircle2 } from "lucide-react";
import { useI18n } from "./language-provider";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";

type ContactModalContextValue = {
  open: () => void;
  close: () => void;
};

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

export function useContactModal() {
  const ctx = useContext(ContactModalContext);
  if (!ctx) throw new Error("useContactModal must be used within ContactModalProvider");
  return ctx;
}

type ContactModalProviderProps = {
  children: React.ReactNode;
};

export function ContactModalProvider({ children }: ContactModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setStatus("idle"), 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    try {
      const res = await fetch("/api/help-center/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          company: data.get("company") || undefined,
          message: data.get("message"),
        }),
      });
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <ContactModalContext.Provider value={{ open, close }}>
      {children}
      <ContactModal isOpen={isOpen} onClose={close} onSubmit={handleSubmit} onRetry={() => setStatus("idle")} status={status} />
    </ContactModalContext.Provider>
  );
}

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  status: "idle" | "sending" | "done" | "error";
};

function ContactModal({ isOpen, onClose, onSubmit, onRetry, status }: ContactModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fn);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", fn);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="contact-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="contact-modal-title" className="text-xl font-bold text-foreground">
                    {t("contact_modal_title")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("contact_modal_subtitle")}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {t("contact_modal_benefit_1")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {t("contact_modal_benefit_2")}
                    </span>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t("contact_modal_close")}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              <ContactForm onSubmit={onSubmit} status={status} onRetry={onRetry} onClose={onClose} variant="modal" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
