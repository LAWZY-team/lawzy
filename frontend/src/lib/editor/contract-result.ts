/**
 * Types and helpers for contract generation API result.
 * Used by editor page: summary fallback when Gemini does not return message.
 */

export interface SourceCitation {
  sourceId?: string
  sourceTitle?: string
  fileName?: string
  pageNumber?: number
  articleNumber?: string
  excerpt?: string
  usedInClause?: string
  relevance?: number
}

export interface LawReference {
  law?: string
  article?: string
  text?: string
}

const CITATION_EXCERPT_MAX = 600

const citationDedupeKey = (c: SourceCitation): string =>
  `${c.sourceId ?? ''}|${(c.excerpt ?? '').slice(0, 96)}|${c.sourceTitle ?? ''}`

/**
 * Builds sourceCitations from agent tool results so metadata stays populated
 * even when the model omits them in JSON.
 */
export const mergeSourceCitationsFromToolCalls = (
  toolCalls: Array<{ name: string; result?: unknown }>,
  existing?: SourceCitation[] | null
): SourceCitation[] => {
  const fromTools: SourceCitation[] = []
  for (const tc of toolCalls) {
    const raw = tc.result
    if (raw === null || raw === undefined) continue
    if (typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    if ('error' in r && typeof r.error === 'string') continue
    if (tc.name === 'get_source_content') {
      const excerpt =
        typeof r.content === 'string' ? r.content.slice(0, CITATION_EXCERPT_MAX) : undefined
      fromTools.push({
        sourceId: typeof r.id === 'string' ? r.id : undefined,
        sourceTitle: typeof r.title === 'string' ? r.title : undefined,
        fileName: typeof r.fileName === 'string' ? r.fileName : undefined,
        excerpt,
      })
    }
    if (tc.name === 'search_sources' && Array.isArray(raw)) {
      for (const row of raw as Array<Record<string, unknown>>) {
        const content = row.content
        fromTools.push({
          sourceId: typeof row.sourceId === 'string' ? row.sourceId : undefined,
          sourceTitle: typeof row.sourceTitle === 'string' ? row.sourceTitle : undefined,
          pageNumber: typeof row.pageNumber === 'number' ? row.pageNumber : undefined,
          excerpt: typeof content === 'string' ? content.slice(0, CITATION_EXCERPT_MAX) : undefined,
          relevance: typeof row.relevance === 'number' ? row.relevance : undefined,
        })
      }
    }
    if (tc.name === 'cite_law') {
      const rag = r.ragSources
      if (!Array.isArray(rag)) continue
      for (const row of rag as Array<Record<string, unknown>>) {
        const content = row.content
        fromTools.push({
          sourceTitle: typeof row.sourceTitle === 'string' ? row.sourceTitle : undefined,
          pageNumber: typeof row.pageNumber === 'number' ? row.pageNumber : undefined,
          excerpt: typeof content === 'string' ? content.slice(0, CITATION_EXCERPT_MAX) : undefined,
          relevance: typeof row.relevance === 'number' ? row.relevance : undefined,
        })
      }
    }
  }
  const merged: SourceCitation[] = [...(existing ?? []), ...fromTools]
  const seen = new Set<string>()
  return merged.filter((c) => {
    const k = citationDedupeKey(c)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Kết quả generate hợp đồng từ API */
export interface ContractGenerationResult {
  type: 'contract_generation'
  content: {
    title?: string
    sections?: unknown[]
    markdown?: string
    mergeFields?: Array<{ key: string; label?: string; type?: string }>
  }
  metadata?: {
    contractType?: string
    prompt?: string
    modifiedSectionIndices?: number[]
    sourceCitations?: SourceCitation[]
    lawReferences?: LawReference[]
    riskTags?: Array<{ tag?: string; level?: string; reason?: string }>
  }
}

/** Tạo nội dung phản hồi đầy đủ: đã tham chiếu nguồn, căn cứ pháp lý, rủi ro, v.v. */
export function buildContractSummaryMessage(result: ContractGenerationResult, locale: string = 'vi'): string {
  const isEn = locale === 'en'
  const title = result.content?.title || (isEn ? 'Contract' : 'Hợp đồng')
  const meta = result.metadata ?? {}
  const lines: string[] = [
    isEn ? `Successfully drafted the contract: **${title}**.` : `Đã soạn thảo xong hợp đồng: **${title}**.`,
    '',
  ]
  const sources = meta.sourceCitations
  if (sources?.length) {
    lines.push(isEn ? '**Referenced Sources:**' : '**Đã tham chiếu nguồn:**')
    sources.forEach((s) => {
      const file = s.fileName || s.sourceId || (isEn ? 'Source' : 'Nguồn')
      const clause = s.usedInClause ? ` (${s.usedInClause})` : ''
      lines.push(`- ${file}${clause}`)
    })
    lines.push('')
  }
  const laws = meta.lawReferences
  if (laws?.length) {
    lines.push(isEn ? '**Applied Legal Bases:**' : '**Căn cứ pháp lý đã áp dụng:**')
    laws.forEach((l) => {
      const law = l.law || ''
      const art = l.article ? ` – ${l.article}` : ''
      const text = l.text ? `: ${l.text}` : ''
      lines.push(`- ${law}${art}${text}`)
    })
    lines.push('')
  }
  const risks = meta.riskTags
  if (risks?.length) {
    lines.push(isEn ? '**Evaluated Risks:**' : '**Rủi ro đã đánh giá:**')
    risks.forEach((r) => {
      const tag = r.tag || '—'
      const level = r.level ? ` (${r.level})` : ''
      const reason = r.reason ? `: ${r.reason}` : ''
      lines.push(`- ${tag}${level}${reason}`)
    })
    lines.push('')
  }
  if (meta.contractType) {
    lines.push(isEn ? `*Contract Type:* ${meta.contractType}` : `*Loại hợp đồng:* ${meta.contractType}`)
    lines.push('')
  }
  const modifiedIndices = meta.modifiedSectionIndices
  if (Array.isArray(modifiedIndices) && modifiedIndices.length > 0) {
    const sections = result.content?.sections as Array<{ heading?: string }> | undefined
    const headings = modifiedIndices
      .filter((i) => sections?.[i]?.heading)
      .map((i) => sections?.[i]?.heading ?? `#${i + 1}`)
    if (headings.length) {
      lines.push(isEn ? `*Updated per request:* ${headings.join(', ')}` : `*Đã cập nhật theo yêu cầu:* ${headings.join(', ')}`)
      lines.push('')
    }
  }
  lines.push(isEn ? 'You can review and edit it on the right panel.' : 'Bạn có thể xem và chỉnh sửa bên phải.')
  return lines.join('\n')
}

const TOOL_NAME_LABELS: Record<string, string> = {
  get_merge_fields: 'Đã thu thập trường trộn',
  get_document_context: 'Đã đọc nội dung hiện tại',
  list_sources: 'Đã liệt kê nguồn tham chiếu',
  get_source_content: 'Đã đọc nội dung nguồn',
  get_attached_files: 'Đã xử lý file đính kèm',
  search_sources: 'Đã tìm kiếm nguồn',
  cite_law: 'Đã trích dẫn luật',
  search_documents: 'Đã tìm kiếm tài liệu',
}

/** Labels when tool đang chạy (for streaming UI) */
export const TOOL_NAME_LABELS_IN_PROGRESS: Record<string, string> = {
  get_merge_fields: 'Đang thu thập trường trộn...',
  get_document_context: 'Đang đọc nội dung hiện tại...',
  list_sources: 'Đang liệt kê nguồn tham chiếu...',
  get_source_content: 'Đang đọc nội dung nguồn...',
  get_attached_files: 'Đang xử lý file đính kèm...',
  search_sources: 'Đang tìm kiếm nguồn...',
  cite_law: 'Đang trích dẫn luật...',
  search_documents: 'Đang tìm kiếm tài liệu...',
}

/** Build thinking string from agent tool calls */
export function buildThinkingFromToolCalls(
  toolCalls: Array<{ name: string; args?: Record<string, unknown>; result?: unknown }>,
  locale: string = 'vi'
): string {
  if (!toolCalls?.length) return ''
  const isEn = locale === 'en'
  const lines = toolCalls.map((tc) => {
    const label = TOOL_NAME_LABELS[tc.name] || tc.name
    return `- ${label}`
  })
  return (isEn ? '**Agent steps:**\n' : '**Các bước xử lý:**\n') + lines.join('\n')
}

