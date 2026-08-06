/**
 * Fixes UTF-8 filenames that were incorrectly decoded as latin1 by multipart parsers.
 * Common for Vietnamese filenames (e.g. "Giấy ủy quyền.docx").
 */
export const fixUploadFilename = (input: string): string => {
  const str = typeof input === 'string' && input.trim() ? input : 'file';
  const candidates: string[] = [str];
  try {
    candidates.push(Buffer.from(str, 'latin1').toString('utf8'));
  } catch {
    // ignore
  }
  if (/%[0-9A-Fa-f]{2}/.test(str)) {
    try {
      candidates.push(decodeURIComponent(str));
    } catch {
      // ignore
    }
  }
  const score = (s: string) => {
    const repl = (s.match(/\uFFFD/g) ?? []).length;
    const mojibake = (s.match(/[ÃÂÄÅÆ]/g) ?? []).length;
    const viLetters = (s.match(/[\u0100-\u024F\u1E00-\u1EFF]/g) ?? []).length;
    let control = 0;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code >= 0x0000 && code <= 0x001f) control++;
    }
    return viLetters * 3 - repl * 10 - mojibake * 2 - control * 5;
  };
  let best = str;
  let bestScore = score(str);
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const candidateScore = score(candidate);
    if (candidateScore > bestScore) {
      best = candidate;
      bestScore = candidateScore;
    }
  }
  return best;
};
