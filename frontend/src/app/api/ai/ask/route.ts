/**
 * Lawzy AI Agent - Server-side loop with Gemini function-calling.
 * Replaces/supplements single-turn generate when agent mode is enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { LAWZY_AGENT_TOOLS } from '../tools/declarations'
import { executeTool, type AgentToolContext } from '../tools/execute'
import { AGENT_SYSTEM_PROMPT } from '@/lib/ai/agent-system-prompt'
import { GeminiClient } from '@/lib/ai/gemini-client'
import {
  buildOutputLanguageInstruction,
  buildResolvedOutputLanguageInstruction,
  mergeFieldsContextHeader,
  type OutputLanguage,
  userMessageLocalePrefix,
} from '@/lib/ai/output-language-instruction'
import type { Locale } from '@/lib/i18n'
import {
  mergeSourceCitationsFromToolCalls,
  type SourceCitation,
} from '@/lib/editor/contract-result'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const AI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_AGENT_TURNS = 8
const GEMINI_MAX_RETRIES = 4
const GEMINI_RETRY_BASE_MS = 900
const MAX_HISTORY_MESSAGES = 20
const GEMINI_TIMEOUT_MS = 60_000
const MAX_INPUT_LENGTH = 4000
const EXPLICIT_BILINGUAL_REQUEST_RE =
  /\b(song ngữ|song-ngu|bilingual|dual language|tiếng anh và tiếng việt|anh việt|việt anh|english and vietnamese|việt[-\s]?anh)\b/i
const EXPLICIT_CHINESE_REQUEST_RE =
  /\b(tiếng trung|tiếng hoa|chinese|中文|简体|繁體|zh[-_]?cn|zh[-_]?tw)\b/i
const VIETNAMESE_DIACRITICS_RE = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i
const CHINESE_CHAR_RE = /[\u3400-\u9fff]/

const normalizePreferredOutputLanguage = (raw: unknown): OutputLanguage | null => {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (value === 'vi' || value === 'en' || value === 'zh' || value === 'bilingual') return value
  return null
}

interface GeminiPart {
  text?: string
  thought?: boolean
  functionCall?: { name: string; args: Record<string, unknown>; id?: string }
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

function buildGeminiApiUrl(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is required')
  return `${GEMINI_API_BASE}/models/${AI_MODEL_NAME}:generateContent?key=${key}`
}

const isThinkingSupported = (modelName: string): boolean => {
  const normalized = modelName.toLowerCase()
  return !normalized.includes('tts')
}

const SESSION_WORKSPACE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const buildAgentSessionContextBlock = (
  workspaceId: string | null | undefined,
  documentId: string | null | undefined
): string => {
  const lines: string[] = []
  const w =
    typeof workspaceId === 'string' && SESSION_WORKSPACE_UUID_RE.test(workspaceId.trim())
      ? workspaceId.trim()
      : null
  if (w) {
    lines.push(
      `Phiên làm việc workspace (UUID): ${w}. Với list_sources / search_sources / search_documents: để trống workspaceId trong tham số tool (hoặc chỉ truyền đúng UUID này).`
    )
  } else {
    lines.push(
      'Chưa có workspace UUID hợp lệ trong phiên — không giả định workspace; dựa vào kết quả tool.'
    )
  }
  if (typeof documentId === 'string' && documentId.trim().length > 0) {
    lines.push(`Document hiện tại (id): ${documentId.trim()}.`)
  }
  if (lines.length === 0) return ''
  return `\n\n**NGỮ CẢNH PHIÊN (SERVER):**\n${lines.join('\n')}\n`
}

const detectOutputLanguageFromMessage = (userMessage: string): OutputLanguage => {
  const msg = userMessage.trim()
  if (!msg) return 'vi'
  if (EXPLICIT_BILINGUAL_REQUEST_RE.test(msg)) return 'bilingual'
  if (EXPLICIT_CHINESE_REQUEST_RE.test(msg) || CHINESE_CHAR_RE.test(msg)) return 'zh'
  if (VIETNAMESE_DIACRITICS_RE.test(msg)) return 'vi'
  // English fallback for latin-only prompts without Vietnamese signals.
  return 'en'
}

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function postGeminiWithRetry(
  url: string,
  body: Record<string, unknown>,
  signal: AbortSignal
): Promise<Response> {
  let delay = GEMINI_RETRY_BASE_MS
  let lastRes: Response | null = null
  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt++) {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify(body),
    })
    lastRes = geminiResponse
    if (geminiResponse.ok) return geminiResponse
    if (geminiResponse.status === 429 || geminiResponse.status === 503) {
      if (attempt < GEMINI_MAX_RETRIES - 1) {
        await sleepMs(delay)
        delay = Math.min(delay * 2, 12_000)
        continue
      }
    }
    return geminiResponse
  }
  return lastRes as Response
}

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  const cookie = req.headers.get('cookie')
  if (cookie) headers['cookie'] = cookie
  const auth = req.headers.get('authorization')
  if (auth) headers['authorization'] = auth
  return headers
}

function messagesToGeminiFormat(
  history: Array<{ role: string; content: string; toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }>
): GeminiContent[] {
  const result: GeminiContent[] = []
  for (const m of history.slice(-MAX_HISTORY_MESSAGES)) {
    if (m.role === 'user') {
      result.push({ role: 'user', parts: [{ text: m.content }] })
      continue
    }
    if (m.role === 'assistant') {
      if (m.toolCalls?.length) {
        for (const tc of m.toolCalls) {
          result.push({
            role: 'model',
            parts: [{ functionCall: { name: tc.name, args: tc.args } }],
          })
          result.push({
            role: 'user',
            parts: [{ functionResponse: { name: tc.name, response: { result: tc.result } } }],
          })
        }
      }
      if (m.content?.trim()) {
        result.push({ role: 'model', parts: [{ text: m.content }] })
      }
    }
  }
  return result
}

/**
 * First balanced `{...}` slice from start, respecting JSON strings so `{{merge}}`
 * inside string values does not break depth counting.
 */
const sliceFirstBalancedJsonObject = (raw: string, start: number): string | null => {
  if (raw[start] !== '{') return null
  let depth = 0
  let inString: '"' | "'" | null = null
  let escape = false
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]
    if (inString) {
      if (escape) {
        escape = false
        continue
      }
      if (c === '\\') {
        escape = true
        continue
      }
      if (c === inString) inString = null
      continue
    }
    if (c === '"' || c === "'") {
      inString = c
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}

const isContractResponseShape = (parsed: unknown): parsed is Record<string, unknown> => {
  if (!parsed || typeof parsed !== 'object') return false
  const p = parsed as { type?: unknown }
  return (
    p.type === 'contract_generation' ||
    p.type === 'contract_review' ||
    p.type === 'intake_questionnaire' ||
    (p.type === 'error' && typeof (p as { message?: unknown }).message === 'string')
  )
}

/** Extract first complete JSON object and parse as contract response */
function tryParseContractResponse(text: string): unknown {
  const trimmed = text.trim()
  const fencedBlocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1].trim())
  const chunks = [...fencedBlocks, trimmed]
  const normalizeLikelyJson = (raw: string): string => {
    // Common LLM defects:
    // - stray backslash before newline inside JSON strings
    // - trailing commas before } or ]
    // - BOM / CRLF noise
    return raw
      .replace(/^\uFEFF/, '')
      .replace(/\r/g, '')
      .replace(/\\\n/g, '\\n')
      .replace(/,\s*([}\]])/g, '$1')
      .trim()
  }
  const tryParseJsonSlice = (raw: string): unknown | null => {
    const slice = normalizeLikelyJson(raw)
    if (!slice.startsWith('{')) return null
    try {
      const parsed = JSON.parse(slice) as unknown
      if (isContractResponseShape(parsed)) return parsed
    } catch {
      //
    }
    const balanced = sliceFirstBalancedJsonObject(slice, 0)
    if (!balanced || balanced === slice) return null
    try {
      const parsed = JSON.parse(normalizeLikelyJson(balanced)) as unknown
      if (isContractResponseShape(parsed)) return parsed
    } catch {
      //
    }
    return null
  }
  for (const chunk of chunks) {
    if (!chunk) continue
    const braceIdx = chunk.indexOf('{')
    if (braceIdx === -1) continue
    const fromBrace = chunk.slice(braceIdx)
    const parsed = tryParseJsonSlice(fromBrace)
    if (parsed) return parsed
    const lastBraceIdx = fromBrace.lastIndexOf('}')
    if (lastBraceIdx > 0) {
      const narrowed = fromBrace.slice(0, lastBraceIdx + 1)
      const parsedNarrowed = tryParseJsonSlice(narrowed)
      if (parsedNarrowed) return parsedNarrowed
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      userMessage,
      workspaceId = null,
      documentId = null,
      mergeFieldValues = {},
      existingContent = '',
      attachedSources = [],
      chatHistory = [],
      stream: useStream = false,
      locale: localeRaw,
      preferredOutputLanguage: preferredOutputLanguageRaw,
    } = body as {
      userMessage?: string
      workspaceId?: string | null
      documentId?: string | null
      mergeFieldValues?: Record<string, string>
      existingContent?: string
      attachedSources?: Array<{ fileName: string; text: string }>
      chatHistory?: Array<{ role: string; content: string; toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }> }>
      stream?: boolean
      locale?: string
      preferredOutputLanguage?: string
    }

    const locale: Locale = localeRaw === 'en' ? 'en' : 'vi'
    const preferredOutputLanguage = normalizePreferredOutputLanguage(preferredOutputLanguageRaw)
    const resolvedOutputLanguage = preferredOutputLanguage ?? detectOutputLanguageFromMessage(userMessage ?? '')
    const outputLanguageReason = preferredOutputLanguage
      ? `frontend preferredOutputLanguage=${preferredOutputLanguage}`
      : 'detected from current user message language'
    const systemPromptWithLocale =
      AGENT_SYSTEM_PROMPT +
      buildOutputLanguageInstruction(locale) +
      buildResolvedOutputLanguageInstruction(resolvedOutputLanguage, outputLanguageReason) +
      buildAgentSessionContextBlock(workspaceId, documentId)

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 })
    }

    if (userMessage.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Tin nhắn không được vượt quá ${MAX_INPUT_LENGTH} ký tự.` },
        { status: 400 }
      )
    }

    const authHeaders = getAuthHeaders(req)
    const gemini = new GeminiClient(apiKey)
    const citeLawFn = (query: string) => gemini.citeLaw(query)

    const toolContext: AgentToolContext = {
      workspaceId,
      documentId,
      mergeFieldValues: mergeFieldValues && typeof mergeFieldValues === 'object' ? mergeFieldValues : {},
      existingContent: typeof existingContent === 'string' ? existingContent : '',
      attachedSources: Array.isArray(attachedSources)
        ? attachedSources.filter(
            (s): s is { fileName: string; text: string } =>
              s && typeof s === 'object' && 'fileName' in s && 'text' in s
          )
        : [],
      authHeaders,
      citeLawFn,
    }

    const truncatedHistory = messagesToGeminiFormat(chatHistory)
    let currentUserMessage = userMessageLocalePrefix(locale) + userMessage
    if (toolContext.mergeFieldValues && Object.keys(toolContext.mergeFieldValues).length > 0) {
      const fieldsText = Object.entries(toolContext.mergeFieldValues)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n')
      currentUserMessage += mergeFieldsContextHeader(locale) + fieldsText
    }
    const contents: GeminiContent[] = [
      ...truncatedHistory,
      { role: 'user', parts: [{ text: currentUserMessage }] },
    ]

    const toolCallsCollected: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []
    const geminiThinkingAccumulated: string[] = []
    let turn = 0
    let lastText = ''

    type StreamEvent =
      | { type: 'tool'; name: string }
      | { type: 'gemini_thinking'; text: string }
      | { type: 'done'; result: unknown }
      | { type: 'error'; message: string }

    async function runAgentLoop(push: (event: StreamEvent) => void): Promise<unknown> {
      while (turn < MAX_AGENT_TURNS) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

        const geminiRequestBody = {
          contents,
          systemInstruction: { parts: [{ text: systemPromptWithLocale }] },
          tools: [{ functionDeclarations: LAWZY_AGENT_TOOLS }],
          toolConfig: { functionCallingConfig: { mode: 'AUTO' as const } },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            ...(process.env.GEMINI_INCLUDE_THOUGHTS !== 'false' &&
            isThinkingSupported(AI_MODEL_NAME)
              ? {
                  thinkingConfig: {
                    thinkingBudget: 8192,
                    includeThoughts: true,
                  },
                }
              : {}),
          },
        }

        const geminiUrl = buildGeminiApiUrl()
        let geminiResponse: Response
        try {
          geminiResponse = await postGeminiWithRetry(
            geminiUrl,
            geminiRequestBody as Record<string, unknown>,
            controller.signal
          )
        } catch (fetchErr) {
          clearTimeout(timeout)
          const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError'
          throw new Error(isTimeout ? 'AI đang xử lý lâu. Vui lòng thử lại.' : 'Không thể kết nối với AI.')
        } finally {
          clearTimeout(timeout)
        }

        const responseData = (await geminiResponse.json().catch(() => null)) as Record<string, unknown>

        if (!geminiResponse.ok) {
          const errMsg =
            typeof responseData?.error === 'string'
              ? responseData.error
              : (responseData?.error as { message?: string })?.message ||
                `API request failed: ${geminiResponse.status}`
          throw new Error(errMsg || 'Dịch vụ AI tạm thời không khả dụng.')
        }

        const parts =
          (responseData?.candidates as Array<{ content?: { parts?: GeminiPart[] } }>)?.[0]?.content
            ?.parts ?? []
        const thoughtTexts = parts
          .filter((p): p is GeminiPart & { thought: true; text: string } => Boolean(p?.thought && typeof (p as GeminiPart).text === 'string'))
          .map((p) => (p as GeminiPart).text as string)
        if (thoughtTexts.length > 0) {
          geminiThinkingAccumulated.push(...thoughtTexts)
          push({ type: 'gemini_thinking', text: thoughtTexts.join('\n\n') })
        }
        const fcPart = parts.find((p) => (p as Record<string, unknown>)?.functionCall || (p as Record<string, unknown>)?.function_call)
        const fc = (fcPart
          ? ((fcPart as Record<string, unknown>).functionCall ?? (fcPart as Record<string, unknown>).function_call)
          : undefined) as { name?: string; args?: Record<string, unknown>; id?: string } | undefined

        if (fc?.name) {
          const name = fc.name
          push({ type: 'tool', name })
          const args = (fc.args ?? {}) as Record<string, unknown>
          const result = await executeTool(name, args, toolContext)
          toolCallsCollected.push({ name, args, result })
          const fcId = (fc as { id?: string }).id
          contents.push({
            role: 'model',
            parts: [{ functionCall: { name, args, id: fcId } }],
          })
          contents.push({
            role: 'user',
            parts: [{ functionResponse: { name, response: { result }, id: fcId } }],
          })
          turn++
          continue
        }

        const outputParts = parts.filter((p) => (p as GeminiPart)?.text && !(p as GeminiPart).thought)
        lastText = outputParts.map((p) => (p as GeminiPart).text).join('').trim()

        if (lastText) {
          const parsedContract = tryParseContractResponse(lastText)
          if (!parsedContract && (lastText.includes('```json') || lastText.trim().startsWith('{'))) {
            console.warn('[POST /api/ai/ask] Failed to parse contract-like JSON output', {
              preview: lastText.slice(0, 500),
            })
          }
          const basePayload = {
            ...(toolCallsCollected.length > 0 ? { toolCalls: toolCallsCollected } : {}),
            ...(geminiThinkingAccumulated.length > 0 ? { geminiThinking: geminiThinkingAccumulated.join('\n\n') } : {}),
          }
          if (parsedContract) {
            const p = parsedContract as {
              type?: string
              message?: string
              metadata?: { sourceCitations?: SourceCitation[] }
            }
            if (p.type === 'error') {
              return { type: 'error', message: p.message ?? lastText, ...basePayload }
            }
            if (p.type === 'contract_generation' && toolCallsCollected.length > 0) {
              const mergedCitations = mergeSourceCitationsFromToolCalls(
                toolCallsCollected,
                p.metadata?.sourceCitations
              )
              return {
                ...parsedContract,
                metadata: {
                  ...(typeof p.metadata === 'object' && p.metadata !== null ? p.metadata : {}),
                  sourceCitations: mergedCitations,
                },
                ...basePayload,
              }
            }
            return {
              ...parsedContract,
              ...basePayload,
            }
          }
          return {
            text: lastText,
            type: 'text',
            ...basePayload,
          }
        }

        turn++
      }

      return {
        text: lastText || 'Xin lỗi, tôi không thể xử lý yêu cầu này. Vui lòng thử lại.',
        type: 'text',
        ...(toolCallsCollected.length > 0 ? { toolCalls: toolCallsCollected } : {}),
        ...(geminiThinkingAccumulated.length > 0 ? { geminiThinking: geminiThinkingAccumulated.join('\n\n') } : {}),
      }
    }

    if (useStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(ctrl) {
          const pushEvent = (event: StreamEvent) => {
            ctrl.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
          }
          try {
            const result = await runAgentLoop(pushEvent)
            pushEvent({ type: 'done', result })
          } catch (e) {
            pushEvent({ type: 'error', message: e instanceof Error ? e.message : 'Lỗi không xác định' })
          } finally {
            ctrl.close()
          }
        },
      })
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const result = await runAgentLoop(() => {})
    return NextResponse.json(result)
  } catch (e) {
    console.error('[POST /api/ai/ask]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Không thể kết nối với AI.' },
      { status: 500 }
    )
  }
}
