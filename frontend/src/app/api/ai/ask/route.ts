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
  mergeFieldsContextHeader,
  userMessageLocalePrefix,
} from '@/lib/ai/output-language-instruction'
import type { Locale } from '@/lib/i18n'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const AI_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_AGENT_TURNS = 5
const MAX_HISTORY_MESSAGES = 20
const GEMINI_TIMEOUT_MS = 60_000
const MAX_INPUT_LENGTH = 4000

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

/** Extract first complete JSON object and parse as contract response */
function tryParseContractResponse(text: string): unknown {
  const trimmed = text.trim()
  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const toParse = blockMatch ? blockMatch[1].trim() : trimmed
  const start = toParse.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let end = -1
  for (let i = start; i < toParse.length; i++) {
    const c = toParse[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null
  try {
    const parsed = JSON.parse(toParse.slice(start, end + 1))
    if (
      parsed?.type === 'contract_generation' ||
      parsed?.type === 'contract_review' ||
      parsed?.type === 'intake_questionnaire'
    ) return parsed
    if (parsed?.type === 'error' && typeof parsed.message === 'string') return parsed
    return null
  } catch {
    return null
  }
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
    }

    const locale: Locale = localeRaw === 'en' ? 'en' : 'vi'
    const systemPromptWithLocale = AGENT_SYSTEM_PROMPT + buildOutputLanguageInstruction(locale)

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
            ...(process.env.GEMINI_INCLUDE_THOUGHTS !== 'false'
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
          geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify(geminiRequestBody),
          })
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
          const basePayload = {
            ...(toolCallsCollected.length > 0 ? { toolCalls: toolCallsCollected } : {}),
            ...(geminiThinkingAccumulated.length > 0 ? { geminiThinking: geminiThinkingAccumulated.join('\n\n') } : {}),
          }
          if (parsedContract) {
            const p = parsedContract as { type?: string; message?: string }
            if (p.type === 'error') {
              return { type: 'error', message: p.message ?? lastText, ...basePayload }
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
