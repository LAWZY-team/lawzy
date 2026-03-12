import { GoogleGenerativeAI } from '@google/generative-ai'
import { LAWZY_SYSTEM_PROMPT } from './system-prompt'

export interface ContractMetadata {
  contractType: string
  parties?: Array<{ role: string; name: string }>
  lawVersions?: string[]
  tags?: string[]
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerateContractRequest {
  type: 'generate_contract'
  metadata: ContractMetadata
  prompt?: string
}

export interface ReviewContractRequest {
  type: 'review_contract'
  content: string
  metadata: ContractMetadata
}

export interface GenerateClauseRequest {
  type: 'generate_clause'
  clauseType: string
  context: Record<string, unknown>
}

export interface CiteLawRequest {
  type: 'cite_law'
  query: string
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    // Dùng gemini-2.5-flash (stable) để tránh 503 overload; có thể override bằng GEMINI_MODEL
    const modelId = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    this.model = this.genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: LAWZY_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536, // Tăng lên mức tối đa để tránh bị cắt nội dung
      },
    })
  }

  /**
   * Extract first complete JSON object from model output (model may return
   * reasoning + duplicate JSON block or trailing markdown).
   */
  /**
   * Find the end of a JSON object/array starting at start (brace-matching, respect strings).
   */
  private findMatchingBrace(str: string, start: number): number {
    const open = str[start]
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inString: '"' | "'" | null = null
    let i = start
    while (i < str.length) {
      const c = str[i]
      if (inString) {
        if (c === inString) {
          let back = 0
          let j = i - 1
          while (j >= 0 && str[j] === '\\') {
            back++
            j--
          }
          if (back % 2 === 0) inString = null
        }
        i++
        continue
      }
      if (c === '"' || c === "'") {
        inString = c
        i++
        continue
      }
      if (c === open) depth++
      else if (c === close) {
        depth--
        if (depth === 0) return i
      }
      i++
    }
    return -1
  }

  private parseResponse(text: string) {
    const trimmed = text.trim()
    const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    const firstBlock = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed

    const tryParse = (raw: string): unknown => {
      const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim()
      try {
        return JSON.parse(clean)
      } catch {
        return null
      }
    }

    // 1) Direct parse (raw or first block)
    let parsed = tryParse(trimmed) ?? tryParse(firstBlock)
    if (parsed) return parsed

    const cleanCandidates = [firstBlock, trimmed].map((c) =>
      c.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim()
    )

    // 2) Brace-match root object
    for (const clean of cleanCandidates) {
      const start = clean.indexOf('{')
      if (start === -1) continue
      const end = this.findMatchingBrace(clean, start)
      if (end === -1) continue
      parsed = tryParse(clean.slice(start, end + 1))
      if (parsed) return parsed
    }

    // 3) Strip "reasoning" value (unescaped " inside breaks JSON)
    const reasoningKey = /"reasoning"\s*:\s*"/
    for (const clean of cleanCandidates) {
      const idx = clean.search(reasoningKey)
      if (idx === -1) continue
      const valueStart = clean.indexOf('"', idx + 10) + 1
      let valueEnd = -1
      let back = 0
      for (let k = valueStart; k < clean.length; k++) {
        if (clean[k] === '\\') {
          back++
          continue
        }
        if (clean[k] === '"') {
          if (back % 2 === 0) {
            valueEnd = k
            break
          }
          back = 0
          continue
        }
        back = 0
      }
      if (valueEnd <= valueStart) continue
      const withoutReasoning = clean.slice(0, valueStart) + '""' + clean.slice(valueEnd + 1)
      parsed = tryParse(withoutReasoning)
      if (parsed) return parsed
    }

    // 4) Extract "content" and "metadata" by key + brace-match, then build result
    for (const clean of cleanCandidates) {
      const contentKey = /"content"\s*:\s*\{/
      const metadataKey = /"metadata"\s*:\s*\{/
      const contentMatch = clean.match(contentKey)
      const metadataMatch = clean.match(metadataKey)
      if (!contentMatch?.index || !metadataMatch?.index) continue
      const contentStart = contentMatch.index + contentMatch[0].indexOf('{')
      const metadataStart = metadataMatch.index + metadataMatch[0].indexOf('{')
      const contentEnd = this.findMatchingBrace(clean, contentStart)
      const metadataEnd = this.findMatchingBrace(clean, metadataStart)
      if (contentEnd === -1 || metadataEnd === -1) continue
      try {
        const content = JSON.parse(clean.slice(contentStart, contentEnd + 1))
        const metadata = JSON.parse(clean.slice(metadataStart, metadataEnd + 1))
        const typeMatch = clean.match(/"type"\s*:\s*"([^"]+)"/)
        return {
          type: typeMatch?.[1] ?? 'contract_generation',
          content: { title: (content?.title as string) ?? 'HỢP ĐỒNG', sections: content?.sections ?? [] },
          metadata: metadata ?? {},
          reasoning: '',
        }
      } catch {
        //
      }
    }

    console.error('Failed to parse AI response. Raw text (first 800 chars):', text.slice(0, 800))
    throw new Error('AI returned invalid JSON')
  }

  async generateContract(
    metadata: ContractMetadata,
    prompt?: string,
    sourcesContext?: string,
    options?: {
      existingContent?: string
      mergeFieldValues?: Record<string, string>
      attachedSources?: Array<{ fileName: string; text: string }>
      chatHistory?: ChatHistoryItem[]
    }
  ) {
    const request: GenerateContractRequest = {
      type: 'generate_contract',
      metadata,
      prompt,
    }

    let userContent = JSON.stringify(request)
    if (options?.existingContent?.trim()) {
      userContent += `\n\n---\n[NỘI DUNG HỢP ĐỒNG HIỆN TẠI - cập nhật/chỉnh sửa dựa trên nội dung này, giữ cấu trúc và các trường trộn {{FIELD_KEY}}]\n${options.existingContent.trim()}`
    }
    if (options?.mergeFieldValues && Object.keys(options.mergeFieldValues).length > 0) {
      const fieldsText = Object.entries(options.mergeFieldValues)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n')
      userContent += `\n\n---\n[DANH SÁCH TRƯỜNG TRỘN VÀ GIÁ TRỊ ĐÃ ĐIỀN - dùng đúng các key này trong mergeFields, có thể tham chiếu giá trị khi cần]\n${fieldsText}`
    }
    if (options?.attachedSources?.length) {
      const attachedBlock = options.attachedSources
        .map((s) => `[FILE ĐÍNH KÈM: ${s.fileName}]\n${(s.text || '').slice(0, 50000)}`)
        .join('\n\n---\n\n')
      userContent += `\n\n---\n[TÀI LIỆU NGƯỜI DÙNG ĐÍNH KÈM - bắt buộc đọc và dựa vào nội dung này để soạn/cập nhật hợp đồng theo yêu cầu]\n${attachedBlock}`
    }
    if (sourcesContext && sourcesContext.trim()) {
      userContent += `\n\n---\n[NGUỒN THAM CHIẾU TỪ WORKSPACE - ưu tiên đối chiếu và trích dẫn khi soạn hợp đồng]\n${sourcesContext.trim()}`
    }

    // Build Gemini-compatible history from previous chat turns (max 20 turns to limit tokens)
    const history = (options?.chatHistory ?? []).slice(-20).map((item) => ({
      role: item.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: item.content }],
    }))

    let text: string
    if (history.length > 0) {
      const chat = this.model.startChat({ history })
      const result = await chat.sendMessage(userContent)
      text = result.response.text()
    } else {
      const result = await this.model.generateContent(userContent)
      text = result.response.text()
    }

    return this.parseResponse(text)
  }

  async reviewContract(content: string, metadata: ContractMetadata) {
    const request: ReviewContractRequest = {
      type: 'review_contract',
      content,
      metadata,
    }

    const prompt = JSON.stringify(request)
    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseResponse(text)
  }

  async generateClause(clauseType: string, context: Record<string, unknown>) {
    const request: GenerateClauseRequest = {
      type: 'generate_clause',
      clauseType,
      context,
    }

    const prompt = JSON.stringify(request)
    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseResponse(text)
  }

  async citeLaw(query: string) {
    const request: CiteLawRequest = {
      type: 'cite_law',
      query,
    }

    const prompt = JSON.stringify(request)
    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return this.parseResponse(text)
  }
}
