"use client"

import Link from "next/link"
import Image from "next/image"
import { useI18n } from "./language-provider"
import { Section, SectionHeader, sectionContainer } from "./landing-section"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useArticles } from "@/hooks/articles/use-articles"
import { getArticleUrl } from "@/lib/articles"
import { useRef } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BlogCardsSection() {
  const { t } = useI18n()
  const { locale } = useI18n()
  const { data, isLoading } = useArticles({
    type: "news",
    status: "published",
    limit: 10,
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      if (scrollLeft <= 10) {
        scrollRef.current.scrollTo({ left: scrollWidth, behavior: "smooth" })
      } else {
        scrollRef.current.scrollBy({ left: -320, behavior: "smooth" })
      }
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      if (Math.ceil(scrollLeft + clientWidth) >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        scrollRef.current.scrollBy({ left: 320, behavior: "smooth" })
      }
    }
  }

  const articles = data?.data ?? []
  const dateLocale = locale === "vi" ? vi : undefined

  if (isLoading) {
    return (
      <Section id="blog" spacing="relaxed" className="border-t border-gray-100/80 dark:border-gray-800/80">
        <div className={sectionContainer}>
          <SectionHeader title={t("blog_section_title")} subtitle={t("blog_section_subtitle")} margin="default" />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </div>
      </Section>
    )
  }

  if (articles.length === 0) return null

  return (
    <Section id="blog" spacing="relaxed" className="border-t border-gray-100/80 dark:border-gray-800/80">
      <div className={sectionContainer}>
        <SectionHeader title={t("blog_section_title")} subtitle={t("blog_section_subtitle")} margin="default" />
        <div className="relative group/carousel">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {articles.map((art) => (
              <div key={art.id} className="snap-start shrink-0 w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                <Link href={getArticleUrl(art.slug, art.type)} className="group block h-full">
                  <Card className="h-full overflow-hidden rounded-2xl border-0 bg-white/90 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.05] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-900/[0.06] hover:ring-orange-200/40 dark:bg-gray-900/90 dark:ring-white/[0.08]">
                    {art.coverImage ? (
                      <div className="relative aspect-video w-full overflow-hidden bg-muted">
                        <Image
                          src={art.coverImage}
                          alt=""
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-orange-50 dark:bg-orange-950/25" />
                    )}
                    <CardHeader>
                      <CardDescription>
                        {art.publishedAt
                          ? format(new Date(art.publishedAt), "d MMMM yyyy", { locale: dateLocale })
                          : ""}
                      </CardDescription>
                      <h3 className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">
                        {art.title}
                      </h3>
                    </CardHeader>
                    {art.excerpt && (
                      <CardContent className="pt-0">
                        <p className="line-clamp-2 text-sm text-muted-foreground">{art.excerpt}</p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute left-[-20px] top-[40%] -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 rounded-full bg-white/90 shadow-md opacity-0 transition-opacity group-hover/carousel:opacity-100 hover:bg-white"
            onClick={scrollLeft}
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-[-20px] top-[40%] -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 rounded-full bg-white/90 shadow-md opacity-0 transition-opacity group-hover/carousel:opacity-100 hover:bg-white"
            onClick={scrollRight}
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </Button>
        </div>
        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 rounded-full border border-orange-200/90 bg-white/90 px-6 py-2.5 text-sm font-semibold text-orange-600 shadow-sm shadow-orange-900/5 transition-all hover:border-orange-300 hover:bg-orange-50/90 hover:shadow-md dark:bg-gray-900/80 dark:hover:bg-orange-950/25"
          >
            {t("blog_view_all")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Section>
  )
}
