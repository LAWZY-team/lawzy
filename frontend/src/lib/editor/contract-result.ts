/**
 * Types and helpers for contract generation API result.
 * Used by editor page: summary fallback when Gemini does not return message.
 */

/** Kết quả generate hợp đồng từ API */
export interface ContractGenerationResult {
  type: 'contract_generation'
  content: { title?: string; sections?: unknown[] }
  metadata?: {
    contractType?: string
    prompt?: string
    modifiedSectionIndices?: number[]
    sourceCitations?: Array<{ sourceId?: string; fileName?: string; excerpt?: string; usedInClause?: string }>
    lawReferences?: Array<{ law?: string; article?: string; text?: string }>
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

