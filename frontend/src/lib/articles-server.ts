const API_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export interface ArticleSummary {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  contentText?: string | null;
  coverImage?: string | null;
  publishedAt?: string | null;
}

export async function fetchArticleBySlug(slug: string): Promise<ArticleSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/articles/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchNewsList(opts?: {
  page?: number;
  limit?: number;
}): Promise<{ data: ArticleSummary[]; totalPages: number }> {
  try {
    const params = new URLSearchParams();
    params.set("type", "news");
    params.set("status", "published");
    params.set("page", String(opts?.page ?? 1));
    params.set("limit", String(opts?.limit ?? 6));
    const res = await fetch(`${API_BASE}/articles?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { data: [], totalPages: 1 };
    const json = await res.json();
    return { data: json.data ?? [], totalPages: json.totalPages ?? 1 };
  } catch {
    return { data: [], totalPages: 1 };
  }
}
