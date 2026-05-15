import type { MetadataRoute } from "next";
import { fetchNewsList } from "@/lib/articles-server";
import {
  getProductionSiteUrl,
  isRobotIndexingAllowed,
} from "@/lib/seo/site-env";

const LANDING_STATIC_PATHS = [
  "/",
  "/pricing",
  "/contact",
  "/products/clm",
  "/products/lpms",
  "/term",
  "/privacy-policy",
  "/news",
] as const;

const toAbsoluteUrl = (base: string, path: string): string =>
  path === "/" ? `${base}/` : `${base}${path}`;

const fetchAllPublishedNewsSlugs = async (): Promise<
  { slug: string; publishedAt?: string | null }[]
> => {
  const articles: { slug: string; publishedAt?: string | null }[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await fetchNewsList({ page, limit: 100 });
    totalPages = result.totalPages;
    for (const item of result.data) {
      if (item.slug) {
        articles.push({ slug: item.slug, publishedAt: item.publishedAt });
      }
    }
    page += 1;
  } while (page <= totalPages);
  return articles;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isRobotIndexingAllowed()) {
    return [];
  }
  const base = getProductionSiteUrl();
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = LANDING_STATIC_PATHS.map((path) => ({
    url: toAbsoluteUrl(base, path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
  const newsArticles = await fetchAllPublishedNewsSlugs();
  const newsEntries: MetadataRoute.Sitemap = newsArticles.map((article) => ({
    url: `${base}/news/${encodeURIComponent(article.slug)}`,
    lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [...staticEntries, ...newsEntries];
}
