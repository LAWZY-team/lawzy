import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
  'ul', 'ol', 'li',
  'a', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'section', 'article', 'header', 'footer',
  'img',
];

const ALLOWED_ATTR: Record<string, string[]> = {
  a: ['href', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'title'],
  '*': ['class'],
};

/**
 * Sanitize HTML to prevent XSS. Used when storing user-provided HTML (e.g. public shares).
 */
export function sanitizeHtmlSafe(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
