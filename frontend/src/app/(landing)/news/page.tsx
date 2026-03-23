"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticles } from "@/hooks/articles/use-articles"
import { getArticleUrl } from "@/lib/articles"
import { useT } from "@/components/i18n-provider"
import { useI18n } from "@/components/landing/language-provider"
import LandingHeader from "@/components/landing/landing-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

export default function NewsPage() {
  const { t } = useT()
  const { locale } = useI18n()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useArticles({
    type: "news",
    status: "published",
    page,
    limit: 12,
  })

  const articles = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const dateLocale = locale === "vi" ? vi : undefined

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{t("news_title")}</h1>
        <p className="text-muted-foreground mb-8">{t("news_subtitle")}</p>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t("news_empty")}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((art) => (
              <Link key={art.id} href={getArticleUrl(art.slug, art.type)}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardDescription>
                      {art.publishedAt
                        ? format(new Date(art.publishedAt), "d MMMM yyyy", { locale: dateLocale })
                        : ""}
                    </CardDescription>
                    <h2 className="text-lg font-semibold line-clamp-2">{art.title}</h2>
                  </CardHeader>
                  {art.excerpt && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{art.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              {t("pagination_prev")}
            </button>
            <span className="px-4 py-2 text-sm text-muted-foreground">
              {t("pagination_page")} {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              {t("pagination_next")}
            </button>
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  )
}
