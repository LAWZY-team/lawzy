/**
 * Article URL helper - uses article type from backend, no hardcoded policy slugs.
 * Policy (chính sách) articles: /{slug}
 * News (tin tức) articles: /news/{slug}
 */
export function getArticleUrl(slug: string, type: string): string {
  return type === "policy" ? `/${slug}` : `/news/${slug}`;
}
