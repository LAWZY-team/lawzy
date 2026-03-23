import type { Metadata } from "next"
import { fetchArticleBySlug } from "@/lib/articles-server"
import NewsDetailClient from "./news-detail-client"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await fetchArticleBySlug(slug)
  if (!article || article.type === "policy") {
    return { title: "Không tìm thấy | Lawzy" }
  }
  return {
    title: `${article.title} | Lawzy`,
    description: article.excerpt ?? undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      publishedTime: article.publishedAt ?? undefined,
    },
  }
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params
  const article = await fetchArticleBySlug(slug)
  return <NewsDetailClient slug={slug} initialArticle={article} />
}
