/**
 * Slugify text - supports Vietnamese by removing diacritics.
 * Used for auto-generating article slugs from title.
 */
export function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "article"
  );
}
