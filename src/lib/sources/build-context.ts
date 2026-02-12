/**
 * Build text context from workspace upload sources for AI prompt.
 * Used when generating contract so AI can reference and cite these sources.
 */

const MAX_PREVIEW_CHARS_PER_SOURCE = 3500

export interface SourceForContext {
  sourceId: string
  fileName: string
  title: string
  previewText?: string
  pageCount?: number
}

export function buildSourcesContext(sources: SourceForContext[]): string {
  if (!sources.length) return ''

  const blocks = sources.map((s, i) => {
    const excerpt = s.previewText
      ? s.previewText.slice(0, MAX_PREVIEW_CHARS_PER_SOURCE) +
        (s.previewText.length > MAX_PREVIEW_CHARS_PER_SOURCE ? '…' : '')
      : '(Chưa có nội dung trích)'
    const pageInfo = s.pageCount != null ? `, ${s.pageCount} trang` : ''
    return `[${i + 1}] File: ${s.fileName} (${s.title}${pageInfo})\nĐoạn:\n${excerpt}`
  })

  return blocks.join('\n\n---\n\n')
}
