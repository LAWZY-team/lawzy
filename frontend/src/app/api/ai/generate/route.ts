import { NextRequest, NextResponse } from 'next/server'
import { GeminiClient, ChatHistoryItem, type ContractMetadata } from '@/lib/ai/gemini-client'
import { buildSourcesContext } from '@/lib/sources/build-context'
import { fetchWorkspaceRagContextForGenerate } from '@/lib/server/fetch-workspace-rag-context'

const getAuthHeaders = (req: NextRequest): Record<string, string> => {
  const headers: Record<string, string> = {}
  const cookie = req.headers.get('cookie')
  if (cookie) headers.cookie = cookie
  const auth = req.headers.get('authorization')
  if (auth) headers.authorization = auth
  return headers
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      locale,
      metadata,
      prompt,
      existingContent,
      mergeFieldValues,
      attachedSources,
      chatHistory,
      workspaceId,
    } = body as {
      locale?: string
      metadata?: unknown
      prompt?: string
      existingContent?: string
      mergeFieldValues?: unknown
      attachedSources?: unknown
      chatHistory?: unknown
      workspaceId?: string | null
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const searchQuery =
      typeof prompt === 'string' && prompt.trim().length > 0
        ? prompt.trim()
        : typeof metadata === 'object' && metadata !== null
          ? JSON.stringify(metadata).slice(0, 2000)
          : 'hợp đồng'
    const ragBlock = await fetchWorkspaceRagContextForGenerate({
      workspaceId,
      query: searchQuery,
      authHeaders: getAuthHeaders(req),
      topK: 8,
    })
    const sourcesContext = ragBlock || buildSourcesContext([])

    const contractMetadata: ContractMetadata =
      metadata && typeof metadata === 'object' && metadata !== null
        ? {
            ...((metadata as Partial<ContractMetadata>) ?? {}),
            contractType:
              typeof (metadata as { contractType?: string }).contractType === 'string'
                ? (metadata as { contractType: string }).contractType
                : 'general',
          }
        : { contractType: 'general' }

    const gemini = new GeminiClient(apiKey)
    const normalizedAttached =
      Array.isArray(attachedSources) &&
      attachedSources.every(
        (s: unknown) => s && typeof s === 'object' && 'fileName' in s && 'text' in s
      )
        ? attachedSources.map((s: { fileName: string; text: string }) => ({
            fileName: String(s.fileName),
            text: String(s.text ?? ''),
          }))
        : undefined

    const normalizedHistory: ChatHistoryItem[] | undefined =
      Array.isArray(chatHistory) &&
      chatHistory.every(
        (h: unknown) =>
          h && typeof h === 'object' && 'role' in h && 'content' in h &&
          (h as { role: string }).role !== undefined
      )
        ? (chatHistory as { role: string; content: string }[])
            .filter((h) => h.role === 'user' || h.role === 'assistant')
            .map((h) => ({ role: h.role as 'user' | 'assistant', content: String(h.content ?? '') }))
        : undefined

    const result = await gemini.generateContract(contractMetadata, prompt, sourcesContext, {
      locale: typeof locale === 'string' ? locale : undefined,
      existingContent: typeof existingContent === 'string' ? existingContent : undefined,
      mergeFieldValues:
        mergeFieldValues && typeof mergeFieldValues === 'object' && !Array.isArray(mergeFieldValues)
          ? Object.fromEntries(
              Object.entries(mergeFieldValues).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')])
            )
          : undefined,
      attachedSources: normalizedAttached?.length ? normalizedAttached : undefined,
      chatHistory: normalizedHistory?.length ? normalizedHistory : undefined,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Generate contract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate contract' },
      { status: 500 }
    )
  }
}
