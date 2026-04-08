/**
 * Server-only: load semantic-search snippets for single-turn generate (non-agent).
 */

import { getBackendBaseUrl } from '@/lib/server/get-backend-base-url'
import { buildSourcesContext, type SourceForContext } from '@/lib/sources/build-context'

const WORKSPACE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_QUERY_LEN = 2000
const MAX_PREVIEW_PER_SOURCE = 4000

/**
 * Returns markdown-style context string for Gemini when workspace + auth are valid.
 */
export const fetchWorkspaceRagContextForGenerate = async (params: {
  workspaceId: unknown
  query: string
  authHeaders: Record<string, string>
  topK?: number
}): Promise<string> => {
  const wid = typeof params.workspaceId === 'string' ? params.workspaceId.trim() : ''
  const q = typeof params.query === 'string' ? params.query.trim() : ''
  if (!WORKSPACE_UUID_RE.test(wid) || !q) return ''
  const url = `${getBackendBaseUrl()}/sources/semantic-search`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...params.authHeaders,
      },
      body: JSON.stringify({
        query: q.slice(0, MAX_QUERY_LEN),
        workspaceId: wid,
        topK: params.topK ?? 8,
        includeSystemSources: true,
      }),
    })
    if (!res.ok) return ''
    const data: unknown = await res.json().catch(() => null)
    if (!Array.isArray(data)) return ''
    const bySource = new Map<string, SourceForContext>()
    for (const row of data as Array<Record<string, unknown>>) {
      const sid = typeof row.sourceId === 'string' ? row.sourceId : ''
      if (!sid) continue
      const title =
        typeof row.sourceTitle === 'string' && row.sourceTitle.trim()
          ? row.sourceTitle.trim()
          : sid
      const chunk =
        typeof row.content === 'string' ? row.content.trim().slice(0, 2000) : ''
      const prev = bySource.get(sid)
      const pageNum = typeof row.pageNumber === 'number' ? row.pageNumber : undefined
      if (prev?.previewText) {
        const combined = `${prev.previewText}\n\n---\n\n${chunk}`.slice(0, MAX_PREVIEW_PER_SOURCE)
        bySource.set(sid, {
          ...prev,
          previewText: combined,
          pageCount: pageNum ?? prev.pageCount,
        })
      } else {
        bySource.set(sid, {
          sourceId: sid,
          fileName: title,
          title,
          previewText: chunk || undefined,
          pageCount: pageNum,
        })
      }
    }
    return buildSourcesContext([...bySource.values()])
  } catch {
    return ''
  }
}
