/**
 * Types and helpers for contract generation API result.
 * Used by editor page: summary message, simulated thinking, loading steps.
 */

/** Kết quả generate hợp đồng từ API */
export interface ContractGenerationResult {
  type: 'contract_generation'
  content: { title?: string; sections?: unknown[] }
  metadata?: {
    contractType?: string
    prompt?: string
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
  lines.push(isEn ? 'You can review and edit it on the right panel.' : 'Bạn có thể xem và chỉnh sửa bên phải.')
  return lines.join('\n')
}

/** Bước hiển thị có điều kiện: chỉ khi vừa extract xong file đính kèm */
export const THINKING_STEP_AFTER_EXTRACT = `**Đã phân tích tài liệu đính kèm**
Đã trích xuất nội dung từ file và sẵn sàng dùng làm ngữ cảnh cho việc soạn văn bản.`

/** Các bước tiến trình suy nghĩ khi đang loading (chung cho mọi loại văn bản/hợp đồng, hiển thị tích lũy) */
export const LOADING_THINKING_STEPS: string[] = [
  `**1. Khởi tạo phân tích (Initiating the Analysis)**
Đang đọc và phân tích yêu cầu của bạn; xác định mục tiêu soạn văn bản/hợp đồng, loại tài liệu và phạm vi nội dung cần có.`,
  `**2. Khung pháp lý (Framing the Legal Landscape)**
Áp dụng khung pháp luật Việt Nam hiện hành phù hợp (BLDS, Luật Thương mại, luật chuyên ngành, nghị định liên quan…). Xác định cấu trúc chuẩn: mở đầu, các điều khoản chính, điều khoản chung.`,
  `**3. Hoàn thiện chi tiết (Refining the Contract Detail)**
Bổ sung tiêu đề có đánh số, trích dẫn điều/khoản luật, trường trộn {{FIELD_KEY}} và định dạng thân thiện Word/Google Docs. Đảm bảo logic pháp lý và giảm thiểu rủi ro tranh chấp.`,
  `**4. Phân tích điều khoản (Deepening the Clause Analysis)**
Rà soát từng điều khoản: đối tượng, quyền và nghĩa vụ các bên, thanh toán (nếu có), bảo mật (nếu có), chấm dứt, trách nhiệm, giải quyết tranh chấp. Đối chiếu với luật liên quan.`,
  `**5. Chi tiết các phần nội dung (Detailing the Sections)**
Chi tiết từng phần theo đúng loại văn bản/hợp đồng. Đối chiếu với tài liệu đính kèm và nguồn workspace nếu có.`,
  `**6. Rà soát cuối cùng (Finalizing the Contract)**
Hoàn thiện điều khoản chung (bất khả kháng, sửa đổi, thông báo). Kiểm tra trích dẫn luật, văn phong chuyên nghiệp và tính nhất quán toàn văn.`,
]

/** Thời gian (ms) chờ trước khi hiển thị từng bước tiếp theo. Bước 1 hiện ngay; bước 2 sau 2.2s; ... */
export const LOADING_THINKING_DELAYS_MS: number[] = [1000, 1000, 1000, 1000, 1000, 1000]

/** Simulation thinking: tiến trình suy nghĩ chung, áp dụng cho mọi loại hợp đồng/văn bản (hiển thị trong "Xem suy luận") */
export function getSimulatedThinking(result: ContractGenerationResult, locale: string = 'vi'): string {
  const isEn = locale === 'en'
  const title = result.content?.title || (isEn ? 'Document' : 'Văn bản')
  const contractType = result.metadata?.contractType || (isEn ? 'Contract / Legal Document' : 'Hợp đồng / văn bản pháp lý')
  const hasSources = (result.metadata?.sourceCitations?.length ?? 0) > 0
  const sourceList = result.metadata?.sourceCitations
    ?.map((s) => s.fileName || s.sourceId)
    .filter(Boolean)
    .join(', ') || ''

  if (isEn) {
    return `**1. Initiating the Analysis**
Read and analyzed your request. Goal: draft "${title}" (${contractType}). Identified the scope, involved parties (if any), and necessary content according to applicable laws.

**2. Framing the Legal Landscape**
Applied suitable legal frameworks (Civil Code, Commercial Law, specialized laws, and related decrees). Established standard structure: preamble (national motto, legal basis, recitals, parties' info); main clauses suitable for the document type (definitions, subject matter, rights & obligations, payment/costs if any, confidentiality if applicable, duration, termination, liabilities, dispute resolution); general provisions and final clauses.
${hasSources ? `Integrated content from attached documents and workspace sources (${sourceList}) into corresponding clauses.\n\n` : ''}
**3. Refining the Contract Detail**
Added numbered headings, accurate legal article citations, and {{FIELD_KEY}} merge fields for information to be filled (document number, signing date, party details, value, etc.). Formatted user-friendly for Word/Google Docs; ensured legal logic and minimized dispute risks.

**4. Deepening the Clause Analysis**
Reviewed each clause: subject matter and scope; rights and obligations; payment terms and late payment penalties (if applicable); confidentiality and data processing (if applicable); term, renewal, termination; limitation of liability and indemnification; dispute resolution. Cross-referenced with relevant legal articles to ensure validity.

**5. Detailing the Sections**
Detailed each section corresponding to the contract/document type: specific content, implementation conditions, standards (if any). Cross-checked with provided attachments and workspace sources.

**6. Finalizing the Contract**
Finalized general provisions (force majeure, amendments, notices, governing language, severability). Verified legal citations, professional tone, and overall consistency. The document is ready for your review and editing.`
  }

  return `**1. Khởi tạo phân tích (Initiating the Analysis)**
Đã đọc và phân tích yêu cầu của bạn. Mục tiêu: soạn "${title}" (${contractType}). Đã xác định phạm vi, các bên liên quan (nếu có) và nội dung cần có theo luật Việt Nam hiện hành.

**2. Khung pháp lý (Framing the Legal Landscape)**
Áp dụng khung pháp luật Việt Nam phù hợp (Bộ luật Dân sự, Luật Thương mại, các luật chuyên ngành và nghị định liên quan). Đã xác định cấu trúc chuẩn: phần mở đầu (quốc hiệu, căn cứ, lời mở đầu, thông tin các bên); các điều khoản chính phù hợp với loại văn bản (định nghĩa, đối tượng, quyền và nghĩa vụ, thanh toán/chi phí nếu có, bảo mật nếu có, thời hạn, chấm dứt, trách nhiệm, tranh chấp); điều khoản chung và điều khoản cuối cùng.
${hasSources ? `Đã tích hợp nội dung từ tài liệu đính kèm và nguồn workspace (${sourceList}) vào các điều khoản tương ứng.\n\n` : ''}
**3. Hoàn thiện chi tiết (Refining the Contract Detail)**
Đã bổ sung tiêu đề có đánh số, trích dẫn điều/khoản luật chính xác và trường trộn {{FIELD_KEY}} cho các thông tin cần điền (số văn bản, ngày ký, thông tin các bên, giá trị, v.v.). Định dạng thân thiện Word/Google Docs; đảm bảo logic pháp lý và giảm thiểu rủi ro tranh chấp.

**4. Phân tích điều khoản (Deepening the Clause Analysis)**
Đã rà soát từng điều khoản: đối tượng và phạm vi; quyền và nghĩa vụ các bên; điều kiện thanh toán và chế tài chậm trả (nếu có); bảo mật và xử lý dữ liệu (nếu áp dụng); thời hạn, gia hạn, chấm dứt; giới hạn trách nhiệm và bồi thường; giải quyết tranh chấp. Đã đối chiếu với các điều luật liên quan để đảm bảo tính hợp lệ.

**5. Chi tiết các phần nội dung (Detailing the Sections)**
Đã chi tiết từng phần theo đúng loại hợp đồng/văn bản: nội dung cụ thể, điều kiện thực hiện, tiêu chuẩn (nếu có). Đã đối chiếu với tài liệu đính kèm và nguồn workspace khi có.

**6. Rà soát cuối cùng (Finalizing the Contract)**
Đã hoàn thiện điều khoản chung (bất khả kháng, sửa đổi văn bản, thông báo, ngôn ngữ, hiệu lực). Đã kiểm tra trích dẫn luật, văn phong chuyên nghiệp và tính nhất quán toàn văn. Văn bản sẵn sàng để bạn xem và chỉnh sửa.`
}
