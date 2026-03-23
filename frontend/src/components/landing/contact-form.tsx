"use client";

import { useState, useEffect } from "react";
import { useI18n } from "./language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ContactFormProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: "idle" | "sending" | "done" | "error";
  onRetry?: () => void;
  onClose?: () => void;
  variant?: "modal" | "page";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{9,}$/;

export function ContactForm({ onSubmit, status, onRetry, onClose, variant = "modal" }: ContactFormProps) {
  const { t } = useI18n();
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    requestAnimationFrame(() => setErrors({}));
  }, [status]);

  const validate = (form: HTMLFormElement): boolean => {
    const data = new FormData(form);
    const next: Record<string, string> = {};
    const name = (data.get("name") as string)?.trim();
    if (!name || name.length < 2) next.name = t("contact_validation_name") || "Please enter your full name";
    const email = (data.get("email") as string)?.trim();
    if (!email) next.email = t("contact_validation_email") || "Please enter your email";
    else if (!EMAIL_RE.test(email)) next.email = t("contact_validation_email_invalid") || "Please enter a valid email";
    const phone = (data.get("phone") as string)?.trim();
    if (phone && !PHONE_RE.test(phone.replace(/\s/g, ""))) next.phone = t("contact_validation_phone") || "Please enter a valid phone number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate(e.currentTarget)) return;
    onSubmit(e);
  };

  if (status === "done") {
    return (
      <div className="py-8 text-center sm:py-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-green-600 dark:text-green-400">{t("contact_modal_success")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("contact_modal_success_desc")}</p>
        {onClose && (
          <Button className="mt-6" onClick={onClose}>
            {t("contact_modal_close")}
          </Button>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-8 text-center sm:py-12">
        <p className="text-red-600 dark:text-red-400 font-medium">{t("contact_modal_error")}</p>
        {onRetry && (
          <Button variant="outline" className="mt-6" onClick={onRetry}>
            {t("contact_modal_retry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="contact-name">{t("contact_modal_name")}</Label>
        <Input
          id="contact-name"
          name="name"
          required
          minLength={2}
          className={cn("mt-1", errors.name && "border-destructive")}
          placeholder={t("contact_modal_name_placeholder")}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-err" : undefined}
        />
        {errors.name && (
          <p id="contact-name-err" className="mt-1 text-xs text-destructive">
            {errors.name}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="contact-email">{t("contact_modal_email")}</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          className={cn("mt-1", errors.email && "border-destructive")}
          placeholder={t("contact_modal_email_placeholder")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contact-phone">{t("contact_modal_phone")}</Label>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          className={cn("mt-1", errors.phone && "border-destructive")}
          placeholder={t("contact_modal_phone_placeholder")}
          aria-invalid={!!errors.phone}
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contact-company">{t("contact_modal_company")}</Label>
        <Input id="contact-company" name="company" className="mt-1" placeholder={t("contact_modal_company_placeholder")} />
      </div>
      <div>
        <Label htmlFor="contact-message">{t("contact_modal_message")}</Label>
        <textarea
          id="contact-message"
          name="message"
          rows={variant === "page" ? 4 : 3}
          className={cn("mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]")}
          placeholder={t("contact_modal_message_placeholder")}
        />
      </div>
      <div className={cn("flex gap-3 pt-2", variant === "page" && "flex-col sm:flex-row")}>
        <Button type="submit" disabled={status === "sending"} className="flex-1 min-h-12 text-base bg-orange-600 hover:bg-orange-700">
          {status === "sending" ? t("contact_modal_sending") : t("contact_modal_submit")}
        </Button>
      </div>
    </form>
  );
}
