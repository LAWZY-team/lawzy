"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticles } from "@/hooks/articles/use-articles";
import { getArticleUrl } from "@/lib/articles";
import { useT } from "@/components/i18n-provider";
import { useI18n } from "@/components/landing/language-provider";
import LandingHeader from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { sectionContainer } from "@/components/landing/landing-section";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function NewsPage() {
  const { t } = useT();
  const { locale } = useI18n();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useArticles({
    type: "news",
    status: "published",
    page,
    limit: 12,
  });

  const articles = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const dateLocale = locale === "vi" ? vi : undefined;

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <main className={sectionContainer}>
        <div className="mx-auto max-w-5xl pb-16 pt-[5.75rem] sm:pb-20 sm:pt-28 md:pt-32 lg:pb-24 lg:pt-36">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{t("news_title")}</h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{t("news_subtitle")}</p>

          {isLoading ? (
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:gap-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("news_empty")}</p>
          ) : (
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:gap-10">
              {articles.map((art) => (
                <Link key={art.id} href={getArticleUrl(art.slug, art.type)} className="group block">
                  <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white/90 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-900/[0.06] hover:ring-orange-200/40 dark:bg-gray-900/90 dark:ring-white/[0.08]">
                    {art.coverImage && (
                      <div className="aspect-[16/9] w-full overflow-hidden bg-muted/30">
                        <img 
                          src={art.coverImage} 
                          alt={(art.metadata as any)?.coverImageAlt || art.title} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider">
                        {art.publishedAt ? format(new Date(art.publishedAt), "d MMMM yyyy", { locale: dateLocale }) : ""}
                      </CardDescription>
                      <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-orange-600">
                        {art.title}
                      </h2>
                    </CardHeader>
                    {art.excerpt && (
                      <CardContent className="pt-0 flex-1">
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{art.excerpt}</p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-gray-200/90 bg-white/90 px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t("pagination_prev")}
              </button>
              <span className="px-4 py-2 text-sm tabular-nums text-muted-foreground">
                {t("pagination_page")} {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-gray-200/90 bg-white/90 px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t("pagination_next")}
              </button>
            </div>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
