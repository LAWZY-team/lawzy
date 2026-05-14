"use client";

import { useI18n } from "@/components/landing/language-provider";
import legalContent from "@/lib/i18n/legal.json";
import { useArticleBySlug } from "@/hooks/articles/use-articles";
import { sanitizeHtml } from "@/lib/sanitize";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { sectionContainer } from "@/components/landing/landing-section";

function getContentByLocale(content: unknown, locale: "vi" | "en"): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const val = c[locale === "vi" ? "vi" : "en"];
  return typeof val === "string" ? val : "";
}

export default function TermPage() {
  const { locale } = useI18n();
  const { data: article, isLoading, error } = useArticleBySlug("term");
  const t = (key: string) =>
    (legalContent as Record<string, Record<string, string>>)[locale]?.[key] ?? key;

  const htmlContent = article
    ? getContentByLocale(article.content, locale) ||
      getContentByLocale(article.content, locale === "vi" ? "en" : "vi") ||
      article.contentText ||
      ""
    : "";

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <main id="main-content" className={sectionContainer}>
        <div className="mx-auto max-w-4xl pb-16 pt-[5.75rem] sm:pb-20 sm:pt-28 md:pt-32 lg:pb-24 lg:pt-36">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t("term_title")}</h1>
          {isLoading ? (
            <div className="mt-10 animate-pulse space-y-4">
              <div className="h-4 w-3/4 rounded-md bg-gray-200/90" />
              <div className="h-4 w-1/2 rounded-md bg-gray-200/90" />
              <div className="h-4 w-5/6 rounded-md bg-gray-200/90" />
            </div>
          ) : error || !htmlContent ? (
            <p className="mt-8 text-muted-foreground">Nội dung chưa có sẵn. Vui lòng thử lại sau.</p>
          ) : (
            <article
              className="lawzy-terms prose prose-lg mt-10 max-w-none rounded-2xl border border-gray-100/90 bg-white/90 p-6 text-foreground shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-10 [&_h1]:mb-4 [&_h1]:mt-10 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
            />
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
