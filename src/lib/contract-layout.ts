/**
 * Bố cục hợp đồng chuẩn Việt Nam — dùng cho template, AI soạn thảo và canvas editor.
 * Tham chiếu: hình thức văn bản hợp đồng (quốc hiệu, tiêu đề, căn cứ pháp lý, lời mở đầu, thông tin các bên).
 */

import type { ContentNode, DocContent } from "@/types/template"

/** Quốc hiệu & khẩu hiệu — luôn cố định */
export const CONTRACT_QUOC_HIEU = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
export const CONTRACT_MOTTO = "Độc lập - Tự do - Hạnh phúc"

/** Căn cứ pháp lý mẫu (có thể mở rộng theo từng loại HĐ) */
export const DEFAULT_LEGAL_BASIS = [
  "Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;",
  "Căn cứ Luật Thương mại và các văn bản hướng dẫn thi hành;",
  "Căn cứ nhu cầu và khả năng thực tế của các bên trong hợp đồng,",
]

/** Lời mở đầu mẫu — placeholders: ngày, tháng, năm, địa điểm */
export const INTRO_STATEMENT_PREFIX = "Hôm nay, ngày"
export const INTRO_STATEMENT_SUFFIX = "chúng tôi gồm có:"

/** Field keys cho phần mở đầu */
export const MERGE_FIELD_SIGNING_DAY = "SIGNING_DAY"
export const MERGE_FIELD_SIGNING_MONTH = "SIGNING_MONTH"
export const MERGE_FIELD_SIGNING_YEAR = "SIGNING_YEAR"
export const MERGE_FIELD_SIGNING_PLACE = "SIGNING_PLACE"

/** Cấu trúc thông tin bên A/B mẫu (Bên sử dụng dịch vụ / Bên cung cấp dịch vụ) */
export const PARTY_A_FIELDS = [
  { key: "PARTY_A_COMPANY", label: "Tên doanh nghiệp" },
  { key: "PARTY_A_ADDRESS", label: "Địa chỉ trụ sở chính" },
  { key: "PARTY_A_TAX_ID", label: "Mã số doanh nghiệp" },
  { key: "PARTY_A_REP", label: "Người đại diện theo pháp luật" },
  { key: "PARTY_A_REP_TITLE", label: "Chức vụ" },
  { key: "PARTY_A_PHONE", label: "Điện thoại liên hệ" },
]

export const PARTY_B_FIELDS = [
  { key: "PARTY_B_COMPANY", label: "Tên doanh nghiệp" },
  { key: "PARTY_B_ADDRESS", label: "Địa chỉ trụ sở chính" },
  { key: "PARTY_B_TAX_ID", label: "Mã số doanh nghiệp" },
  { key: "PARTY_B_REP", label: "Người đại diện theo pháp luật" },
  { key: "PARTY_B_REP_TITLE", label: "Chức vụ" },
  { key: "PARTY_B_PHONE", label: "Điện thoại liên hệ" },
]

/**
 * Tạo dãy node nội dung cho **phần đầu hợp đồng chuẩn VN** (quốc hiệu → tiêu đề → số HĐ → căn cứ → lời mở đầu).
 * Không bao gồm thông tin các bên (Bên A/B) — phần đó do từng mẫu tự định nghĩa.
 */
export function buildStandardContractHeader(options: {
  contractTitle: string
  contractNumberPrefix?: string
  year?: string
  legalBasis?: string[]
}): ContentNode[] {
  const {
    contractTitle,
    contractNumberPrefix = "HDDV",
    year = "2023",
    legalBasis = DEFAULT_LEGAL_BASIS,
  } = options

  const nodes: ContentNode[] = [
    // 1. Quốc hiệu — căn giữa, in đậm, chữ in hoa
    {
      type: "heading",
      attrs: { level: 1, align: "center" },
      content: [{ type: "text", text: CONTRACT_QUOC_HIEU }],
    },
    // 2. Khẩu hiệu — căn giữa, chữ thường
    {
      type: "heading",
      attrs: { level: 2, align: "center" },
      content: [{ type: "text", text: CONTRACT_MOTTO }],
    },
    // 3. Gạch ngang trang trí
    {
      type: "paragraph",
      attrs: { align: "center", divider: true },
      content: [],
    },
    // 4. Tiêu đề hợp đồng — căn giữa, in đậm, in hoa
    {
      type: "heading",
      attrs: { level: 1, align: "center" },
      content: [{ type: "text", text: contractTitle }],
    },
    // 5. Số hợp đồng — căn giữa (trường merge: số, năm, ký hiệu)
    {
      type: "paragraph",
      attrs: { align: "center" },
      content: [
        { type: "text", text: "Số: " },
        { type: "field", attrs: { fieldKey: "CONTRACT_NUMBER", label: "Số HĐ", fieldType: "string" } },
        { type: "text", text: `/${year}/${contractNumberPrefix}` },
      ],
    },
    // 6. Căn cứ pháp lý — căn trái, in nghiêng, dạng bullet
    ...legalBasis.flatMap((line) => [
      {
        type: "paragraph",
        attrs: { align: "left" as const },
        content: [{ type: "text", text: `- ${line}`, marks: [{ type: "italic" }] }],
      } as ContentNode,
    ]),
    // 7. Lời mở đầu — căn trái, có placeholder ngày/tháng/năm/nơi
    {
      type: "paragraph",
      attrs: { align: "left" },
      content: [
        { type: "text", text: `${INTRO_STATEMENT_PREFIX} ` },
        { type: "field", attrs: { fieldKey: MERGE_FIELD_SIGNING_DAY, label: "Ngày", fieldType: "string" } },
        { type: "text", text: " tháng " },
        { type: "field", attrs: { fieldKey: MERGE_FIELD_SIGNING_MONTH, label: "Tháng", fieldType: "string" } },
        { type: "text", text: " năm " },
        { type: "field", attrs: { fieldKey: MERGE_FIELD_SIGNING_YEAR, label: "Năm", fieldType: "string" } },
        { type: "text", text: ", tại " },
        { type: "field", attrs: { fieldKey: MERGE_FIELD_SIGNING_PLACE, label: "Địa điểm", fieldType: "string" } },
        { type: "text", text: ` ${INTRO_STATEMENT_SUFFIX}` },
      ],
    },
  ]

  return nodes
}

/**
 * Nội dung mẫu cho một bên (Bên A hoặc B): heading + danh sách bullet (nhãn + trường trống).
 */
export function buildPartyBlock(
  partyLabel: string,
  fields: { key: string; label: string }[]
): ContentNode[] {
  const nodes: ContentNode[] = [
    {
      type: "heading",
      attrs: { level: 2, align: "left" },
      content: [{ type: "text", text: partyLabel }],
    },
    ...fields.map(
      (f) =>
        ({
          type: "paragraph",
          attrs: { align: "left" as const },
          content: [
            { type: "text", text: `- ${f.label}: ` },
            { type: "field", attrs: { fieldKey: f.key, label: f.label, fieldType: "string" as const } },
          ],
        }) as ContentNode
    ),
  ]
  return nodes
}

/**
 * Ghép header chuẩn + khối Bên A + khối Bên B + phần nội dung điều khoản (body).
 * Dùng để tạo contentJSON đầy đủ cho mẫu hợp đồng dịch vụ.
 */
export function buildDocWithStandardLayout(
  headerOptions: Parameters<typeof buildStandardContractHeader>[0],
  bodyContent: ContentNode[]
): DocContent {
  const header = buildStandardContractHeader(headerOptions)
  const partyA = buildPartyBlock("BÊN SỬ DỤNG DỊCH VỤ (sau đây gọi tắt là bên A):", PARTY_A_FIELDS)
  const partyB = buildPartyBlock("BÊN CUNG CẤP DỊCH VỤ (sau đây gọi tắt là bên B):", PARTY_B_FIELDS)
  return {
    type: "doc",
    content: [...header, ...partyA, ...partyB, ...bodyContent],
  }
}
