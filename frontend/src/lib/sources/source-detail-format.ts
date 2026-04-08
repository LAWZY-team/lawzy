/**
 * PDF extractors often emit a newline after almost every token. `pre` + pre-wrap
 * then shows one word per line. Collapse those single newlines to spaces; keep
 * `\n\n+` as paragraph breaks.
 */
export const formatExtractedContentForPreview = (raw: string): string => {
  let s = raw.replace(/\r\n/g, "\n").trim()
  s = s.replace(/(?<!\n)\n(?!\n)/g, " ")
  s = s.replace(/[ \t]{2,}/g, " ")
  return s
}

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["B", "KB", "MB", "GB"] as const
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
