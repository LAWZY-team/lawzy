"use client";

import { BlogCardsSection } from "./blog-cards-section";
import { Newspaper } from "./newspaper";

/** News & Articles, then Lawzy in the press — single block on the landing page. */
export function NewsAndPressSection() {
  return (
    <>
      <BlogCardsSection />
      <Newspaper />
    </>
  );
}
