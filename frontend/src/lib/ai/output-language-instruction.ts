import type { Locale } from '@/lib/i18n'
export type OutputLanguage = 'vi' | 'en' | 'zh' | 'bilingual'

/**
 * Appends to Gemini system instruction so contract, questionnaire labels,
 * and chat "message" match the user's selected UI language (vi | en).
 * JSON keys / mergeFieldKey snake_case stay unchanged.
 */
export function buildOutputLanguageInstruction(locale: Locale): string {
  const localeName = locale === 'en' ? 'English' : 'Vietnamese'
  return `

**SYSTEM LOCALE CONTEXT (INFORMATION ONLY):**
- Current frontend locale: ${localeName}.
- This locale is for UI/system naming context only.
- Do NOT use system locale as the main rule to choose response language.`
}

export function buildResolvedOutputLanguageInstruction(language: OutputLanguage, reason: string): string {
  if (language === 'en') {
    return `

**RESOLVED OUTPUT LANGUAGE (MANDATORY): ENGLISH**
- Reason: ${reason}
- Return all user-visible prose in English.
- Keep JSON keys/technical identifiers unchanged.
- Do not mix other languages unless the user explicitly asks bilingual in this turn.`
  }
  if (language === 'zh') {
    return `

**RESOLVED OUTPUT LANGUAGE (MANDATORY): CHINESE (SIMPLIFIED)**
- Reason: ${reason}
- Return all user-visible prose in Simplified Chinese.
- Keep JSON keys/technical identifiers unchanged.
- Do not mix other languages unless the user explicitly asks bilingual in this turn.`
  }
  if (language === 'bilingual') {
    return `

**RESOLVED OUTPUT LANGUAGE (MANDATORY): BILINGUAL VIETNAMESE-ENGLISH**
- Reason: ${reason}
- Return bilingual Vietnamese-English content for user-visible prose.
- Keep JSON keys/technical identifiers unchanged.`
  }
  return `

**RESOLVED OUTPUT LANGUAGE (BẮT BUỘC): TIẾNG VIỆT**
- Lý do: ${reason}
- Toàn bộ nội dung hiển thị cho người dùng bằng tiếng Việt.
- Giữ nguyên key JSON/định danh kỹ thuật.
- Không trộn ngôn ngữ khác trừ khi người dùng yêu cầu song ngữ rõ ràng ở lượt này.`
}

export function mergeFieldsContextHeader(locale: Locale): string {
  if (locale === 'en') {
    return '\n\n---\n[MERGE FIELDS AND CURRENT VALUES — use these exact keys; reference values as needed. Do not ask again for information already listed here.]\n'
  }
  return '\n\n---\n[DANH SÁCH TRƯỜNG TRỘN VÀ GIÁ TRỊ ĐÃ ĐIỀN — dùng đúng các key này, có thể tham chiếu giá trị khi cần. Không hỏi lại thông tin đã có ở đây.]\n'
}

export function userMessageLocalePrefix(locale: Locale): string {
  if (locale === 'en') {
    return '[System context: frontend locale = English (UI naming context only).]\n\n'
  }
  return '[Ngữ cảnh hệ thống: locale frontend = tiếng Việt (chỉ là ngữ cảnh hiển thị hệ thống).]\n\n'
}
