/**
 * Public site origin for canonical URLs, Open Graph, and JSON-LD.
 * Uses existing NEXT_PUBLIC_APP_URL when set; otherwise production default for local SEO checks.
 */
export const getPublicSiteUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://lawzy.vn";
};

export const toAbsoluteUrl = (pathOrUrl: string): string => {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const base = getPublicSiteUrl();
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
};
