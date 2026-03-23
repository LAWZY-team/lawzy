"use client";

import { useI18n } from "@/components/landing/language-provider";
import legalContent from "@/lib/i18n/legal.json";
import { useArticleBySlug } from "@/hooks/articles/use-articles";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

function getContentByLocale(content: unknown, locale: "vi" | "en"): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const val = c[locale === "vi" ? "vi" : "en"];
  return typeof val === "string" ? val : "";
}

export default function PrivacyPolicyPage() {
  const { locale } = useI18n();
  const { data: article, isLoading, error } = useArticleBySlug("privacy-policy");
  const t = (key: string) =>
    (legalContent as Record<string, Record<string, string>>)[locale]?.[key] ?? key;

  const htmlContent = article
    ? getContentByLocale(article.content, locale) ||
      getContentByLocale(article.content, locale === "vi" ? "en" : "vi") ||
      article.contentText ||
      ""
    : "";

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto px-4 pt-20 pb-12 max-w-4xl md:pt-24">
        <h1 className="text-3xl font-bold mb-8">{t("privacy_title")}</h1>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        ) : error || !htmlContent ? (
          <p className="text-muted-foreground">Nội dung chưa có sẵn. Vui lòng thử lại sau.</p>
        ) : (
          <article
            className="lawzy-terms prose prose-lg max-w-none text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
