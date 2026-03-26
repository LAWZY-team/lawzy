export function fixMojibake(str: string): string {
  if (!str || typeof str !== 'string') return str
  // Try to fix common mojibake for UTF-8 filenames decoded as latin1 (Ã, Â, …),
  // and also handle percent-encoded variants.
  if (!/[\u00C2-\u00C6ÃÂÄÅÆ]|%[0-9A-Fa-f]{2}/.test(str)) return str
  try {
    if (/%[0-9A-Fa-f]{2}/.test(str)) {
      try {
        const decoded = decodeURIComponent(str)
        if (decoded && !decoded.includes('\uFFFD')) return decoded
      } catch {
        // fallthrough
      }
    }
    const fixed = new TextDecoder('utf-8').decode(
      new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff))
    )
    return fixed.includes('\uFFFD') ? str : fixed
  } catch {
    return str
  }
}
