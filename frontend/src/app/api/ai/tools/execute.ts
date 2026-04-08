/**
 * Execute AI Agent tools. Called by the agent loop when model returns functionCall.
 */

import { getBackendBaseUrl } from '@/lib/server/get-backend-base-url'

const MAX_SOURCE_CONTENT_CHARS = 50000
const MAX_ATTACHED_TEXT_PER_FILE = 50000

export interface AgentToolContext {
  workspaceId: string | null
  documentId: string | null
  mergeFieldValues: Record<string, string>
  existingContent: string
  attachedSources: Array<{ fileName: string; text: string }>
  authHeaders: Record<string, string>
  /** Optional: để tránh circular fetch, route có thể inject hàm gọi cite-law */
  citeLawFn?: (query: string) => Promise<unknown>
}

const WORKSPACE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Prefer the session workspace UUID; ignore model-hallucinated ids like "LAWZY_WORKSPACE".
 */
const resolveAgentWorkspaceId = ({
  context,
  argsWorkspaceId,
}: {
  context: AgentToolContext
  argsWorkspaceId: unknown
}): string | null => {
  const ctxId =
    typeof context.workspaceId === 'string' ? context.workspaceId.trim() : ''
  const argId =
    typeof argsWorkspaceId === 'string' ? argsWorkspaceId.trim() : ''
  if (WORKSPACE_UUID_RE.test(ctxId)) return ctxId
  if (WORKSPACE_UUID_RE.test(argId)) return argId
  return ctxId || argId || null
}

async function fetchBackend(
  path: string,
  ctx: AgentToolContext
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `${getBackendBaseUrl()}${path}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...ctx.authHeaders,
      },
    })
    if (!res.ok) {
      return { ok: false, error: `Backend ${res.status}` }
    }
    const data = await res.json().catch(() => null)
    return { ok: true, data }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Fetch failed',
    }
  }
}

async function fetchBackendPost(
  path: string,
  body: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `${getBackendBaseUrl()}${path}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...ctx.authHeaders,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return { ok: false, error: `Backend ${res.status}` }
    }
    const data = await res.json().catch(() => null)
    return { ok: true, data }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Fetch failed',
    }
  }
}

/** When semantic search fails or returns no chunks, match source titles (workspace + Lawzy per plan). */
async function fallbackSearchSourcesByTitle(params: {
  workspaceId: string
  query: string
  context: AgentToolContext
}): Promise<unknown> {
  const { workspaceId, query, context } = params
  const fallbackRes = await fetchBackend(
    `/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=20&includeSystem=true`,
    context,
  )
  if (!fallbackRes.ok) {
    return { error: fallbackRes.error || 'Không thể tìm nguồn' }
  }
  const payload = fallbackRes.data as { data?: Array<Record<string, unknown>> }
  const items = Array.isArray(payload?.data) ? payload.data : []
  const q = query.toLowerCase().trim()
  const tokens = q.split(/\s+/).filter((w) => w.length >= 2)
  const filtered = items.filter((s) => {
    const title = String(s.title ?? '').toLowerCase()
    if (q.length >= 2 && title.includes(q)) return true
    return tokens.some((t) => title.includes(t))
  })
  return filtered.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
  }))
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentToolContext
): Promise<unknown> {
  switch (name) {
    case 'get_merge_fields': {
      const entries = Object.entries(context.mergeFieldValues)
      if (entries.length === 0) {
        return { message: 'Không có trường trộn nào đã điền', fields: {} }
      }
      return {
        fields: Object.fromEntries(entries),
        keys: entries.map(([k]) => k),
      }
    }

    case 'get_document_context': {
      if (!context.existingContent?.trim()) {
        return { message: 'Document chưa có nội dung', content: '' }
      }
      const preview = context.existingContent.slice(0, 30000)
      return {
        content: preview,
        truncated: context.existingContent.length > 30000,
      }
    }

    case 'get_attached_files': {
      if (!context.attachedSources?.length) {
        return { message: 'Không có file đính kèm', files: [] }
      }
      const files = context.attachedSources.map((s) => ({
        fileName: s.fileName,
        text: (s.text || '').slice(0, MAX_ATTACHED_TEXT_PER_FILE),
      }))
      return { files }
    }

    case 'list_sources': {
      const workspaceId = resolveAgentWorkspaceId({
        context,
        argsWorkspaceId: args.workspaceId,
      })
      if (!workspaceId) {
        return { error: 'Thiếu workspaceId' }
      }
      const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 10
      const res = await fetchBackend(
        `/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}&includeSystem=true`,
        context
      )
      if (!res.ok) {
        return { error: res.error || 'Không thể lấy danh sách nguồn' }
      }
      const payload = res.data as { data?: Array<Record<string, unknown>> }
      const items = Array.isArray(payload?.data) ? payload.data : []
      return items.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        createdAt: s.createdAt,
      }))
    }

    case 'get_source_content': {
      const sourceId = typeof args.sourceId === 'string' ? args.sourceId : ''
      if (!sourceId) {
        return { error: 'Thiếu sourceId' }
      }
      const res = await fetchBackend(`/sources/${encodeURIComponent(sourceId)}`, context)
      if (!res.ok) {
        return { error: res.error || 'Không thể lấy nội dung nguồn' }
      }
      const source = res.data as Record<string, unknown>
      const content = source?.content
      const text = typeof content === 'string' ? content : ''
      const truncated = text.slice(0, MAX_SOURCE_CONTENT_CHARS)
      return {
        id: source?.id,
        title: source?.title,
        fileName: (source as { s3Key?: string })?.s3Key?.split('/').pop(),
        content: truncated || '(Chưa có nội dung trích xuất)',
        truncated: text.length > MAX_SOURCE_CONTENT_CHARS,
      }
    }

    case 'search_sources': {
      const workspaceId = resolveAgentWorkspaceId({
        context,
        argsWorkspaceId: args.workspaceId,
      })
      const query = typeof args.query === 'string' ? args.query : ''
      if (!workspaceId || !query?.trim()) {
        return { error: 'Thiếu workspaceId hoặc query' }
      }
      const topK = typeof args.topK === 'number' ? Math.min(args.topK, 20) : 10
      const searchRes = await fetchBackendPost(
        `/sources/semantic-search`,
        {
          query,
          workspaceId,
          topK,
          includeSystemSources: true,
        },
        context
      )
      if (!searchRes.ok) {
        return fallbackSearchSourcesByTitle({ workspaceId, query, context })
      }
      const results = Array.isArray(searchRes.data) ? searchRes.data : []
      if (results.length === 0) {
        return fallbackSearchSourcesByTitle({ workspaceId, query, context })
      }
      return results.map((r: Record<string, unknown>) => ({
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        content: r.content,
        pageNumber: r.pageNumber,
        relevance: r.relevance,
      }))
    }

    case 'cite_law': {
      const query = typeof args.query === 'string' ? args.query : ''
      if (!query?.trim()) {
        return { error: 'Thiếu query trích dẫn luật' }
      }

      // First: search system legal sources via RAG for grounded citations
      const citeWorkspaceId = resolveAgentWorkspaceId({
        context,
        argsWorkspaceId: undefined,
      })
      if (citeWorkspaceId) {
        try {
          const ragRes = await fetchBackendPost(
            `/sources/semantic-search`,
            {
              query,
              workspaceId: citeWorkspaceId,
              topK: 5,
              includeSystemSources: true,
            },
            context
          )
          if (ragRes.ok && Array.isArray(ragRes.data) && (ragRes.data as unknown[]).length > 0) {
            const ragResults = (ragRes.data as Array<Record<string, unknown>>).map((r) => ({
              sourceTitle: r.sourceTitle,
              content: r.content,
              pageNumber: r.pageNumber,
              relevance: r.relevance,
            }))

            // Augment with AI cite-law for structured interpretation
            let aiCitation: unknown = null
            if (context.citeLawFn) {
              try {
                aiCitation = await context.citeLawFn(query)
              } catch { /* ignore */ }
            }

            return {
              ragSources: ragResults,
              aiInterpretation: aiCitation,
              message: `Tìm thấy ${ragResults.length} đoạn nguồn liên quan đến "${query}"`,
            }
          }
        } catch { /* fall through to AI-only cite */ }
      }

      if (context.citeLawFn) {
        try {
          return await context.citeLawFn(query)
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : 'Cite law failed',
          }
        }
      }
      try {
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
          'http://localhost:3000'
        const res = await fetch(`${origin}/api/ai/cite-law`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        if (!res.ok) return { error: `Cite law API ${res.status}` }
        return await res.json().catch(() => ({ error: 'Invalid response' }))
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Cite law failed' }
      }
    }

    case 'search_documents': {
      const workspaceId = resolveAgentWorkspaceId({
        context,
        argsWorkspaceId: args.workspaceId,
      })
      const query = typeof args.query === 'string' ? args.query : ''
      if (!workspaceId || !query?.trim()) {
        return { error: 'Thiếu workspaceId hoặc query' }
      }
      const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5
      const res = await fetchBackend(
        `/documents?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit * 3}`,
        context
      )
      if (!res.ok) {
        return { error: res.error || 'Không thể tìm document' }
      }
      const payload = res.data as { data?: Array<Record<string, unknown>> }
      const items = Array.isArray(payload?.data) ? payload.data : []
      const q = query.toLowerCase()
      const filtered = items
        .filter((s) => String(s.title ?? '').toLowerCase().includes(q))
        .slice(0, limit)
      return filtered.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
      }))
    }

    default:
      return { error: `Tool không tồn tại: ${name}` }
  }
}
