/**
 * Execute AI Agent tools. Called by the agent loop when model returns functionCall.
 */

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

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

async function fetchBackend(
  path: string,
  ctx: AgentToolContext
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = `${BACKEND_URL.replace(/\/$/, '')}${path}`
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
      const workspaceId =
        (typeof args.workspaceId === 'string' ? args.workspaceId : null) ||
        context.workspaceId
      if (!workspaceId) {
        return { error: 'Thiếu workspaceId' }
      }
      const limit = typeof args.limit === 'number' ? Math.min(args.limit, 20) : 10
      const res = await fetchBackend(
        `/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=${limit}`,
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
      const workspaceId =
        (typeof args.workspaceId === 'string' ? args.workspaceId : null) ||
        context.workspaceId
      const query = typeof args.query === 'string' ? args.query : ''
      if (!workspaceId || !query?.trim()) {
        return { error: 'Thiếu workspaceId hoặc query' }
      }
      // Backend may not have search; we list and filter client-side for now
      const res = await fetchBackend(
        `/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=20`,
        context
      )
      if (!res.ok) {
        return { error: res.error || 'Không thể tìm nguồn' }
      }
      const payload = res.data as { data?: Array<Record<string, unknown>> }
      const items = Array.isArray(payload?.data) ? payload.data : []
      const q = query.toLowerCase()
      const filtered = items.filter((s) => {
        const title = String(s.title ?? '').toLowerCase()
        const tags = s.tags
        const tagStr = Array.isArray(tags)
          ? tags.map((t) => String(t)).join(' ').toLowerCase()
          : ''
        return title.includes(q) || tagStr.includes(q)
      })
      return filtered.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
      }))
    }

    case 'cite_law': {
      const query = typeof args.query === 'string' ? args.query : ''
      if (!query?.trim()) {
        return { error: 'Thiếu query trích dẫn luật' }
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
      // Fallback: fetch internal route (requires correct origin in serverless)
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
      const workspaceId =
        (typeof args.workspaceId === 'string' ? args.workspaceId : null) ||
        context.workspaceId
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
