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
  bufferOrBlob: ArrayBuffer | Blob | string | any,
  replacements: ReplacementItem[]
): Promise<FillOneDocxResult> {
  let input: any = bufferOrBlob
  const options: JSZip.JSZipLoadOptions = {}

  if (typeof input === 'string') {
    options.base64 = true
  } else if (
    input &&
    typeof input === 'object' &&
    !(input instanceof Blob) &&
    !(input instanceof ArrayBuffer) &&
    !(typeof input.byteLength === 'number') &&
    !(typeof input.size === 'number')
  ) {
    if (input._base64 || input._fileBase64 || input.base64) {
      input = input._base64 || input._fileBase64 || input.base64
      options.base64 = true
    } else {
      throw new Error(
        "Dữ liệu file Word (.docx) không hợp lệ hoặc đã bị mất khi tải lại trang (do localStorage không lưu được nhị phân). Vui lòng vào Tab 2 'Bộ Hồ Sơ Mẫu' để tải lại file Word lên."
      )
    }
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(input, options)
  } catch (err: any) {
    if (
      String(err?.message || '').includes("Can't read the data") ||
      !(input instanceof Blob || input instanceof ArrayBuffer || typeof input === 'string' || typeof input?.byteLength === 'number')
    ) {
      throw new Error(
        "Dữ liệu file Word (.docx) không đọc được (có thể do trang web tải lại và mất buffer nhị phân). Vui lòng vào Tab 2 'Bộ Hồ Sơ Mẫu', tải lại file .docx lên để làm mới dữ liệu!"
      )
    }
    throw err
  }

  const targetRe = /^word\/(document|header[0-9]*|footer[0-9]*|footnotes|endnotes)\.xml$/
  let total = 0

  for (const name of Object.keys(zip.files)) {
    if (!targetRe.test(name)) continue
    const entry = zip.file(name)
    if (!entry) continue

    let content = await entry.async('string')

    // Sort replacements by longest alias first to ensure more specific placeholders are replaced before shorter ones
    const sortedReps = [...replacements].map((rep) => {
      const aliases = Array.from(
        new Set(
          rep.aliases
            .filter((a) => Boolean(a && a.trim()))
            .map((a) => a.trim())
        )
      ).sort((a, b) => b.length - a.length)
      return { value: rep.value, aliases }
    })

    for (const rep of sortedReps) {
      const safeVal = escapeXml(rep.value)
      if (safeVal === undefined || safeVal === null) continue

      for (const alias of rep.aliases) {
        const cleanAlias = alias.replace(/^[\[\{\<]+|[\]\}\>]+$/g, '').trim()
        if (!cleanAlias) continue

        // Build regex patterns across optional XML tags (<[^>]+>)*
        const chars = Array.from(cleanAlias)
        const innerPattern = chars
          .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('(?:<[^>]+>)*')

        // Priority 1: Match [cleanAlias] across XML tags & strip square brackets
        const squareRe = new RegExp('\\[(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*\\]', 'gi')
        const squareMatches = content.match(squareRe)
        if (squareMatches) {
          total += squareMatches.length
          content = content.replace(squareRe, safeVal)
        }

        // Priority 2: Match {{cleanAlias}} across XML tags & strip curly brackets
        const curlyRe = new RegExp('\\{\\{(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*\\}\\}', 'gi')
        const curlyMatches = content.match(curlyRe)
        if (curlyMatches) {
          total += curlyMatches.length
          content = content.replace(curlyRe, safeVal)
        }

        // Priority 3: Match <<cleanAlias>> across XML tags & strip angle brackets
        const angleRe = new RegExp('<<(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*>>', 'gi')
        const angleMatches = content.match(angleRe)
        if (angleMatches) {
          total += angleMatches.length
          content = content.replace(angleRe, safeVal)
        }

        // Priority 4: Match exact alias (e.g. if alias itself has brackets or if exact match needed)
        const exactPattern = Array.from(alias)
          .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('(?:<[^>]+>)*')
        const exactRe = new RegExp(exactPattern, 'gi')
        const exactMatches = content.match(exactRe)
        if (exactMatches) {
          total += exactMatches.length
          content = content.replace(exactRe, safeVal)
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
  bufferOrBlob?: ArrayBuffer | Blob | string | any
  _base64?: string
  _fileBase64?: string
}

export interface BatchFillResult {
  zipBlob: Blob
  totalReplacements: number
  results: Array<{
    name: string
    blob: Blob | null
    count: number
    error?: boolean
    errorMessage?: string
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
      const inputData = f._base64 || f._fileBase64 || f.bufferOrBlob
      const { blob, count } = await fillOneDocx(inputData, replacements)
      totalReplacements += count
      results.push({ name: f.name, blob, count })

      // Add to ZIP with prefix DA_DIEN_
      const cleanName = f.name.replace(/^DA_DIEN_/i, '')
      zip.file(`DA_DIEN_${cleanName}`, blob)
    } catch (err: any) {
      console.error(`Error processing docx file ${f.name}:`, err)
      results.push({
        name: f.name,
        blob: null,
        count: 0,
        error: true,
        errorMessage: err?.message || 'Lỗi đọc file Word'
      })
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { zipBlob, totalReplacements, results }
}
