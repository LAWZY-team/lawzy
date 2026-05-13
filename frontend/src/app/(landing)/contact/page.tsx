"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/landing/language-provider";
import { ContactForm } from "@/components/landing/contact-form";
import { sectionContainer } from "@/components/landing/landing-section";
import { ContactModalProvider } from "@/components/landing/contact-modal";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Cta } from "@/components/landing/cta";
import { ROUTES } from "@/lib/routes";

export default function ContactPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

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
    <ContactModalProvider>
      <div className="landing-light min-h-screen bg-[#faf9f5]">
        <LandingHeader />
        <main className={sectionContainer}>
          <div className="relative grid gap-12 pb-16 pt-[5.75rem] sm:grid-cols-[1fr_340px] sm:gap-16 sm:pb-20 sm:pt-28 md:pt-32 lg:grid-cols-[1fr_380px] lg:gap-20 lg:pb-24 lg:pt-36">
            <div className="pointer-events-none absolute left-0 top-[5.5rem] h-1 w-16 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 opacity-90 sm:top-24 md:top-28" aria-hidden />
            <div>
              <h1 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {t("contact_page_title")}
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
                {t("contact_page_subtitle")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
                <Cta href={ROUTES.login} label={t("try_free")} icon={ChevronRight} variant="primary" className="sm:min-w-[11rem]" />
              </div>

              <div className="mt-10 max-w-xl rounded-2xl border border-gray-100/90 bg-white/80 p-6 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-sm sm:mt-12 sm:p-8">
                <ContactForm onSubmit={handleSubmit} status={status} onRetry={() => setStatus("idle")} variant="page" />
              </div>
            </div>

            <div className="lg:border-l lg:border-gray-200/90 lg:pl-12 lg:pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("footer_contact")}</h2>
              <ul className="mt-5 space-y-5 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <a href="mailto:contact@lawzy.vn" className="text-foreground transition-colors hover:text-orange-600">
                    contact@lawzy.vn
                  </a>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <a href="tel:+84908716707" className="text-foreground transition-colors hover:text-orange-600">
                    +84 908 716 707
                  </a>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <span className="text-foreground/90">{t("footer_address")}</span>
                </li>
              </ul>
              <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{t("contact_page_note")}</p>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    </ContactModalProvider>
  );
}
