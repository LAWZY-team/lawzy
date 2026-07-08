import JSZip from 'jszip'

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Escapes special XML characters so injected text doesn't corrupt word/document.xml
 */
export function escapeXml(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface ReplacementItem {
  value: string
  aliases: string[]
}

export interface FillOneDocxResult {
  blob: Blob
  count: number
}

/**
 * Replaces string occurrences of aliases with target values inside all word/*.xml components of a .docx file.
 */
export async function fillOneDocx(
  bufferOrBlob: ArrayBuffer | Blob,
  replacements: ReplacementItem[]
): Promise<FillOneDocxResult> {
  const zip = await JSZip.loadAsync(bufferOrBlob)
  const targetRe = /^word\/(document|header[0-9]*|footer[0-9]*|footnotes|endnotes)\.xml$/
  let total = 0

  for (const name of Object.keys(zip.files)) {
    if (!targetRe.test(name)) continue
    const entry = zip.file(name)
    if (!entry) continue

    let content = await entry.async('string')
    for (const rep of replacements) {
      const safeVal = escapeXml(rep.value)
      for (const alias of rep.aliases) {
        if (!alias || !alias.trim()) continue
        const trimmedAlias = alias.trim()
        const escapedRe = trimmedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(escapedRe, 'g')
        const matches = content.match(re)
        if (matches) {
          total += matches.length
          content = content.split(re).join(safeVal)
        }
      }
    }
    zip.file(name, content)
  }

  const blobOut = await zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME })
  return { blob: blobOut, count: total }
}

export interface BatchFileItem {
  name: string
  bufferOrBlob: ArrayBuffer | Blob
}

export interface BatchFillResult {
  zipBlob: Blob
  totalReplacements: number
  results: Array<{
    name: string
    blob: Blob | null
    count: number
    error?: boolean
  }>
}

/**
 * Batch processes multiple .docx files and generates a single ho_so_da_dien.zip file.
 */
export async function batchFillAndZip(
  files: BatchFileItem[],
  replacements: ReplacementItem[],
  onProgress?: (index: number, fileName: string) => void
): Promise<BatchFillResult> {
  const zip = new JSZip()
  let totalReplacements = 0
  const results: BatchFillResult['results'] = []

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (onProgress) onProgress(i + 1, f.name)

    try {
      const { blob, count } = await fillOneDocx(f.bufferOrBlob, replacements)
      totalReplacements += count
      results.push({ name: f.name, blob, count })

      // Add to ZIP with prefix DA_DIEN_
      const cleanName = f.name.replace(/^DA_DIEN_/i, '')
      zip.file(`DA_DIEN_${cleanName}`, blob)
    } catch (err) {
      console.error(`Error processing docx file ${f.name}:`, err)
      results.push({ name: f.name, blob: null, count: 0, error: true })
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { zipBlob, totalReplacements, results }
}
