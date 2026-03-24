export function fixMojibake(str: string): string {
  if (!str || typeof str !== 'string') return str
  if (!/[\u00C2-\u00C6]/.test(str)) return str
  try {
    const fixed = new TextDecoder('utf-8').decode(
      new Uint8Array([...str].map((c) => c.charCodeAt(0) & 0xff))
    )
    return fixed.includes('\uFFFD') ? str : fixed
  } catch {
    return str
  }
}
