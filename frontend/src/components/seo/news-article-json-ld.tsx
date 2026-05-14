import { JsonLdScript } from "./json-ld";
import { getPublicSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";
import type { ArticleSummary } from "@/lib/articles-server";

type NewsArticleJsonLdProps = { article: ArticleSummary; slug: string };

export function NewsArticleJsonLd({ article, slug }: NewsArticleJsonLdProps) {
  const site = getPublicSiteUrl();
  const pageUrl = `${site}/news/${encodeURIComponent(slug)}`;
  const imageUrl =
    article.coverImage && (article.coverImage.startsWith("http") || article.coverImage.startsWith("//"))
      ? article.coverImage
      : article.coverImage
        ? toAbsoluteUrl(article.coverImage)
        : undefined;
  const articleNode: Record<string, unknown> = {
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.publishedAt ?? undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    url: pageUrl,
    publisher: { "@type": "Organization", name: "LAWZY", url: site },
  };
  if (imageUrl) articleNode.image = [imageUrl];
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${site}/` },
          { "@type": "ListItem", position: 2, name: "Tin tức", item: `${site}/news` },
          { "@type": "ListItem", position: 3, name: article.title, item: pageUrl },
        ],
      },
      articleNode,
    ],
  };
  return <JsonLdScript data={data} />;
}
