import DOMPurify from "isomorphic-dompurify"

const PROSE_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "code", "pre",
  "ul", "ol", "li",
  "a", "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "section", "article", "header", "footer",
  "img", "figure", "figcaption",
] as const

const PROSE_ATTRS = ["href", "target", "rel", "title", "alt", "src", "class", "style"]

/**
 * Sanitize HTML to prevent XSS when using dangerouslySetInnerHTML.
 * Allows safe prose/legal content: headings, paragraphs, lists, links, tables, etc.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...PROSE_TAGS],
    ALLOWED_ATTR: [...PROSE_ATTRS],
    ADD_ATTR: ["target"],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize editor HTML (TipTap output) before parsing. Keeps data-field-key for merge fields.
 */
export function sanitizeEditorHtml(html: string): string {
  if (!html || typeof html !== "string") return ""
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...PROSE_TAGS],
    ALLOWED_ATTR: [...PROSE_ATTRS, "data-field-key", "style"],
    ADD_ATTR: ["target", "data-field-key"],
    ALLOW_DATA_ATTR: true,
  })
}
