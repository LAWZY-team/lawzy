import type { Locale } from '@/lib/i18n'

/**
 * Appends to Gemini system instruction so contract, questionnaire labels,
 * and chat "message" match the user's selected UI language (vi | en).
 * JSON keys / mergeFieldKey snake_case stay unchanged.
 */
export function buildOutputLanguageInstruction(locale: Locale): string {
  if (locale === 'en') {
    return `

**OUTPUT LANGUAGE (MANDATORY):** The user's selected app language is English.
- Write all user-visible prose in English: contract title, section headings, clause bodies, party blocks, and the "message" field in every JSON response.
- For intake_questionnaire: questionnaire title, description, every field "label", "placeholder", and select/radio/checkbox option strings must be in English. Keep "key" and "mergeFieldKey" as technical snake_case identifiers (unchanged).
- For contract_generation: draft the full contract in English while still applying Vietnamese law. When citing statutes, use the official Vietnamese name and you may add a short English gloss in parentheses on first mention if helpful.
- For contract_review: "clause", "reason", "suggestion", overall summary, and "message" in English. Risk "level" must remain one of: low, medium, high.
- Do not switch the user's language unless they explicitly ask for another language in their message.
`
  }

  return `

**NGÔN NGỮ ĐẦU RA (BẮT BUỘC):** Người dùng đang chọn giao diện tiếng Việt.
- Viết toàn bộ văn bản hiển thị cho người dùng bằng tiếng Việt: tiêu đề hợp đồng, tiêu đề điều khoản, nội dung điều khoản, phần thông tin các bên, và trường "message" trong mọi JSON.
- Với intake_questionnaire: title, description, mọi "label", "placeholder" và chuỗi lựa chọn (select/radio/checkbox) bằng tiếng Việt. "key" và "mergeFieldKey" giữ dạng định danh kỹ thuật (snake_case), không đổi.
- Với contract_generation: soạn toàn văn hợp đồng bằng tiếng Việt, căn cứ pháp luật Việt Nam.
- Với contract_review: "clause", "reason", "suggestion", phần tóm tắt và "message" bằng tiếng Việt. "level" chỉ dùng: low, medium, high.
- Không đổi ngôn ngữ đầu ra trừ khi người dùng yêu cầu rõ ràng ngôn ngữ khác trong tin nhắn.
`
}

export function mergeFieldsContextHeader(locale: Locale): string {
  if (locale === 'en') {
    return '\n\n---\n[MERGE FIELDS AND CURRENT VALUES — use these exact keys; reference values as needed. Do not ask again for information already listed here.]\n'
  }
  return '\n\n---\n[DANH SÁCH TRƯỜNG TRỘN VÀ GIÁ TRỊ ĐÃ ĐIỀN — dùng đúng các key này, có thể tham chiếu giá trị khi cần. Không hỏi lại thông tin đã có ở đây.]\n'
}

export function userMessageLocalePrefix(locale: Locale): string {
  if (locale === 'en') {
    return '[Context: User app language is English — follow OUTPUT LANGUAGE rules above.]\n\n'
  }
  return '[Ngữ cảnh: Ngôn ngữ ứng dụng là tiếng Việt — tuân thủ quy tắc NGÔN NGỮ ĐẦU RA ở trên.]\n\n'
}
