"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticleBySlug } from "@/hooks/articles/use-articles"
import { useI18n } from "@/components/landing/language-provider"
import { useT } from "@/components/i18n-provider"
import LandingHeader from "@/components/landing/landing-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { getArticleUrl } from "@/lib/articles"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

export default function NewsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { t } = useT()
  const { locale } = useI18n()

  const { data: article, isLoading, error } = useArticleBySlug(slug)

  useEffect(() => {
    if (article && article.type === "policy") {
      router.replace(getArticleUrl(article.slug, article.type))
    }
  }, [article, router])

  const dateLocale = locale === "vi" ? vi : undefined

  if (article?.type === "policy") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang chuyển hướng...</div>
      </div>
    )
  }

  if (error || (!isLoading && !article)) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <p className="text-center text-muted-foreground">{t("news_not_found")}</p>
          <div className="flex justify-center mt-6">
            <Button asChild variant="outline">
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("news_back")}
              </Link>
            </Button>
          </div>
        </main>
        <LandingFooter />
      </div>
    )
  }

  if (isLoading || !article) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
        <LandingFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/news">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("news_back")}
          </Link>
        </Button>

        <article>
          <p className="text-sm text-muted-foreground mb-2">
            {article.publishedAt
              ? format(new Date(article.publishedAt), "d MMMM yyyy", { locale: dateLocale })
              : ""}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-6">{article.title}</h1>
          {article.excerpt && (
            <p className="text-lg text-muted-foreground mb-8">{article.excerpt}</p>
          )}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html:
                typeof article.contentText === "string" && article.contentText
                  ? article.contentText.replace(/\n/g, "<br />")
                  : article.excerpt ?? "",
            }}
          />
        </article>
      </main>
      <LandingFooter />
    </div>
  )
}
