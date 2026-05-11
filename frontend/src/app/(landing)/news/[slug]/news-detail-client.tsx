"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticleBySlug } from "@/hooks/articles/use-articles"
import { useI18n } from "@/components/landing/language-provider"
import { useT } from "@/components/i18n-provider"
import LandingHeader from "@/components/landing/landing-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { getArticleUrl } from "@/lib/articles"
import { sanitizeHtml } from "@/lib/sanitize"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import type { ArticleSummary } from "@/lib/articles-server"

function getContentHtml(article: {
  contentText?: string | null
  excerpt?: string | null
}): string {
  const raw = typeof article.contentText === "string" && article.contentText
    ? article.contentText.trim()
    : article.excerpt ?? ""
  if (!raw) return ""
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return raw.replace(/\n/g, "<br />")
}

interface NewsDetailClientProps {
  slug: string
  initialArticle: ArticleSummary | null
}

export default function NewsDetailClient({
  slug,
  initialArticle,
}: NewsDetailClientProps) {
  const router = useRouter()
  const { t } = useT()
  const { locale } = useI18n()

  const { data: article, isLoading, error } = useArticleBySlug(slug)
  const display = article ?? initialArticle

  useEffect(() => {
    if (display && display.type === "policy") {
      router.replace(getArticleUrl(display.slug, display.type))
    }
  }, [display, router])

  const dateLocale = locale === "vi" ? vi : undefined

  if (display?.type === "policy") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Đang chuyển hướng...</div>
      </div>
    )
  }

  if (error || (!isLoading && !display)) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 pt-20 pb-10 max-w-3xl md:pt-24 md:pb-12">
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

  if (isLoading && !display) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 pt-20 pb-10 max-w-3xl md:pt-24 md:pb-12">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-64 w-full" />
        </main>
        <LandingFooter />
      </div>
    )
  }

  if (!display) return null

  const html = getContentHtml(display)

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container mx-auto px-4 pt-20 pb-10 max-w-3xl md:pt-24 md:pb-12">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
          <Link href="/news">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("news_back")}
          </Link>
        </Button>

        <article>
          {display.coverImage && (
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={display.coverImage}
                alt={display.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-2">
            {display.publishedAt
              ? format(new Date(display.publishedAt), "d MMMM yyyy", { locale: dateLocale })
              : ""}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mb-6">{display.title}</h1>
          {display.excerpt && (
            <p className="text-lg text-muted-foreground mb-8">{display.excerpt}</p>
          )}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: html ? sanitizeHtml(html) : "",
            }}
          />
        </article>
      </main>
      <LandingFooter />
    </div>
  )
}
