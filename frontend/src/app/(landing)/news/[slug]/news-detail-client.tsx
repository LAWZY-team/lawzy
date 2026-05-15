"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticleBySlug } from "@/hooks/articles/use-articles"
import { useI18n } from "@/components/landing/language-provider"
import { useT } from "@/components/i18n-provider"
import LandingHeader from "@/components/landing/landing-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { sectionContainer } from "@/components/landing/landing-section"
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

const articleShell = "mx-auto max-w-3xl pb-16 pt-[5.5rem] sm:pb-20 sm:pt-28 md:pt-32 lg:pb-24 lg:pt-36"

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
      <div className="landing-light flex min-h-screen items-center justify-center bg-[#faf9f5]">
        <div className="animate-pulse text-sm text-muted-foreground">Đang chuyển hướng...</div>
      </div>
    )
  }

  if (error || (!isLoading && !display)) {
    return (
      <div className="landing-light min-h-screen bg-[#faf9f5]">
        <LandingHeader />
        <main className={sectionContainer}>
          <div className={articleShell}>
          <p className="text-center text-muted-foreground">{t("news_not_found")}</p>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className="rounded-full border-gray-200/90 bg-white/90 shadow-sm">
              <Link href="/news">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("news_back")}
              </Link>
            </Button>
          </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    )
  }

  if (isLoading && !display) {
    return (
      <div className="landing-light min-h-screen bg-[#faf9f5]">
        <LandingHeader />
        <main className={sectionContainer}>
          <div className={articleShell}>
          <Skeleton className="mb-4 h-9 w-3/4 rounded-lg" />
          <Skeleton className="mb-8 h-4 w-32 rounded-md" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </main>
        <LandingFooter />
      </div>
    )
  }

  if (!display) return null

  const html = getContentHtml(display)

  return (
    <div className="landing-light min-h-screen bg-[#faf9f5]">
      <LandingHeader />
      <main className={sectionContainer}>
        <div className={articleShell}>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 rounded-full text-muted-foreground hover:bg-white/80 hover:text-foreground">
          <Link href="/news">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("news_back")}
          </Link>
        </Button>

        <article className="rounded-2xl border border-gray-100/90 bg-white/90 p-6 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-sm sm:p-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {display.publishedAt
              ? format(new Date(display.publishedAt), "d MMMM yyyy", { locale: dateLocale })
              : ""}
          </p>
          <h1 className="mb-5 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.25rem] md:leading-tight">
            {display.title}
          </h1>
          {display.excerpt && (
            <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground">{display.excerpt}</p>
          )}
          <div
            className="prose prose-neutral max-w-none dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: html ? sanitizeHtml(html) : "",
            }}
          />
        </article>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
