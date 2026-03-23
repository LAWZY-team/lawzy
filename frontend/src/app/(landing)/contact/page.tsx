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
        <div className="grid gap-12 pt-[5.5rem] sm:pt-28 md:pt-32 pb-12 lg:grid-cols-[1fr_360px] lg:gap-16 lg:py-20">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("contact_page_title")}</h1>
            <p className="mt-3 text-muted-foreground">{t("contact_page_subtitle")}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Cta href={ROUTES.login} label={t("try_free")} icon={ChevronRight} variant="primary" className="sm:min-w-[11rem]" />
            </div>

            <div className="mt-10 max-w-xl">
              <ContactForm onSubmit={handleSubmit} status={status} onRetry={() => setStatus("idle")} variant="page" />
            </div>
          </div>

          <div className="lg:border-l lg:border-gray-200 lg:pl-12 lg:pt-8">
            <h2 className="text-lg font-semibold text-foreground">{t("footer_contact")}</h2>
            <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                <a href="mailto:contact@lawzy.vn" className="text-foreground hover:text-orange-600 transition-colors">
                  contact@lawzy.vn
                </a>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                <a href="tel:+84908716707" className="text-foreground hover:text-orange-600 transition-colors">
                  +84 908 716 707
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                <span>{t("footer_address")}</span>
              </li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">{t("contact_page_note")}</p>
          </div>
        </div>
      </main>
        <LandingFooter />
      </div>
    </ContactModalProvider>
  );
}
