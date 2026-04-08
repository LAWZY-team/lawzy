/**
 * One-off: login → optional reprocess sources → POST /api/ai/ask.
 * Run: node scripts/smoke-ai-contract.mjs
 * Uses seed admin credentials (dev only).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const BACKEND = process.env.BACKEND_SMOKE_URL || 'http://127.0.0.1:5000'
const FRONTEND = process.env.FRONTEND_SMOKE_URL || 'http://127.0.0.1:3000'
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@lawzy.vn'
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Lawzy@2026'
const DO_REPROCESS = process.env.SMOKE_REPROCESS === '1'

async function main() {
  const jar = new Map()

  const storeCookies = (setCookie) => {
    if (!setCookie) return
    const parts = Array.isArray(setCookie) ? setCookie : [setCookie]
    for (const line of parts) {
      const [pair] = line.split(';')
      const [k, ...rest] = pair.split('=')
      if (k && rest.length) jar.set(k.trim(), rest.join('=').trim())
    }
  }

  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')

  const loginRes = await fetch(`${BACKEND}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  })
  storeCookies(loginRes.headers.getSetCookie?.() ?? loginRes.headers.get('set-cookie'))
  if (!loginRes.ok) {
    const t = await loginRes.text()
    throw new Error(`login ${loginRes.status}: ${t.slice(0, 200)}`)
  }

  const wsRes = await fetch(`${BACKEND}/workspaces`, {
    headers: { cookie: cookieHeader() },
  })
  if (!wsRes.ok) throw new Error(`workspaces ${wsRes.status}`)
  const workspaces = await wsRes.json()
  const workspaceId = workspaces[0]?.id
  if (!workspaceId) throw new Error('no workspace')

  const listRes = await fetch(
    `${BACKEND}/sources?workspaceId=${encodeURIComponent(workspaceId)}&limit=50&includeSystem=true`,
    { headers: { cookie: cookieHeader() } },
  )
  if (!listRes.ok) throw new Error(`sources list ${listRes.status}`)
  const listJson = await listRes.json()
  const sourceIds = (listJson.data ?? []).map((s) => s.id)

  if (DO_REPROCESS) {
    for (const id of sourceIds) {
      const rp = await fetch(`${BACKEND}/sources/${id}/reprocess`, {
        method: 'POST',
        headers: { cookie: cookieHeader() },
      })
      console.log(`reprocess ${id.slice(0, 8)}… ${rp.ok ? 'started' : rp.status}`)
      await new Promise((r) => setTimeout(r, 4000))
    }
  } else {
    console.log('reprocess skipped (set SMOKE_REPROCESS=1 to enable)')
  }

  const askBody = {
    userMessage:
      '[QUESTIONNAIRE_RESPONSE] Bên A: Phụ huynh Nguyễn Văn A. Bên B: Trường Mầm non công lập X (TP.HCM). Soạn hợp đồng dịch vụ giáo dục mầm non ngắn gọn; phải căn cứ các khoản thu và mức thu theo Nghị quyết 18/2025/NQ-HĐND năm học 2025-2026 từ nguồn workspace. Trả JSON type contract_generation, metadata.sourceCitations trích đúng nguồn đó.',
    workspaceId,
    documentId: null,
    mergeFieldValues: {},
    existingContent: '',
    attachedSources: [],
    chatHistory: [],
    stream: false,
    locale: 'vi',
  }

  const askRes = await fetch(`${FRONTEND}/api/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader(),
    },
    body: JSON.stringify(askBody),
  })
  const askText = await askRes.text()
  const outPath = join(root, 'scripts', 'smoke-ai-contract-result.json')
  writeFileSync(outPath, askText, 'utf8')
  console.log(`ask HTTP ${askRes.status} → ${outPath}`)

  let parsed
  try {
    parsed = JSON.parse(askText)
  } catch {
    console.log('response not JSON, see file')
    return
  }

  const tools = parsed.toolCalls?.map((t) => t.name) ?? []
  console.log('toolCalls:', tools.join(', ') || '(none)')
  const cites = JSON.stringify(parsed.metadata?.sourceCitations ?? [])
  const hasNq = /18\s*\/\s*2025|nq-hđnd|hdnd|2025-2026/i.test(
    cites + (parsed.content?.markdown ?? '') + (parsed.message ?? ''),
  )
  console.log('mentions NQ 18 / 2025-2026:', hasNq)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
