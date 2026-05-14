import type { Metadata } from "next";
import { fetchArticleBySlug } from "@/lib/articles-server";
import NewsDetailClient from "./news-detail-client";
import { NewsArticleJsonLd } from "@/components/seo/news-article-json-ld";
import { toAbsoluteUrl } from "@/lib/seo/site-url";

type Props = { params: Promise<{ slug: string }> };

function ogImageForArticle(coverImage?: string | null): { url: string; alt?: string }[] | undefined {
  if (!coverImage) return undefined;
  const url =
    coverImage.startsWith("http://") || coverImage.startsWith("https://") ? coverImage : toAbsoluteUrl(coverImage);
  return [{ url, alt: "Ảnh bìa bài viết Lawzy" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  if (!article || article.type === "policy") {
    return { title: "Không tìm thấy | Lawzy", robots: { index: false, follow: false } };
  }
  const path = `/news/${slug}`;
  const ogImages = ogImageForArticle(article.coverImage);
  return {
    title: `${article.title} | Lawzy`,
    description: article.excerpt ?? undefined,
    alternates: { canonical: path },
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      url: path,
      publishedTime: article.publishedAt ?? undefined,
      locale: "vi_VN",
      siteName: "LAWZY",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt ?? undefined,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticleBySlug(slug);
  return (
    <>
      {article && article.type !== "policy" ? <NewsArticleJsonLd article={article} slug={slug} /> : null}
      <NewsDetailClient slug={slug} initialArticle={article} />
    </>
  );
}
