import JSZip from 'jszip';

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const WORD_XML =
  /^word\/(document|header[0-9]*|footer[0-9]*|footnotes|endnotes)\.xml$/;

/**
 * Escapes special XML characters so injected text doesn't corrupt word/document.xml
 */
export const escapeXml = (str: string): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export interface ReplacementItem {
  value: string;
  aliases: string[];
}

export interface FillOneDocxResult {
  buffer: Buffer;
  count: number;
}

/**
 * Replaces string occurrences of aliases with target values inside all word/*.xml
 * components of a .docx file.
 */
export const fillOneDocx = async (
  input: Buffer | ArrayBuffer | string,
  replacements: ReplacementItem[],
): Promise<FillOneDocxResult> => {
  const options: JSZip.JSZipLoadOptions = {};
  let loadInput: Buffer | ArrayBuffer | string = input;
  if (typeof loadInput === 'string') {
    options.base64 = true;
  }
  const zip = await JSZip.loadAsync(loadInput, options);
  let total = 0;
  for (const name of Object.keys(zip.files)) {
    if (!WORD_XML.test(name)) continue;
    const entry = zip.file(name);
    if (!entry) continue;
    let content = await entry.async('string');
    const sortedReps = [...replacements].map((rep) => {
      const aliases = Array.from(
        new Set(
          rep.aliases
            .filter((alias) => Boolean(alias && alias.trim()))
            .map((alias) => alias.trim()),
        ),
      ).sort((a, b) => b.length - a.length);
      return { value: rep.value, aliases };
    });
    for (const rep of sortedReps) {
      const safeVal = escapeXml(rep.value);
      if (safeVal === undefined || safeVal === null) continue;
      for (const alias of rep.aliases) {
        const cleanAlias = alias.replace(/^[\[\{\<]+|[\]\}\>]+$/g, '').trim();
        if (!cleanAlias) continue;
        const chars = Array.from(cleanAlias);
        const innerPattern = chars
          .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('(?:<[^>]+>)*');
        const squareRe = new RegExp(
          '\\[(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*\\]',
          'gi',
        );
        const squareMatches = content.match(squareRe);
        if (squareMatches) {
          total += squareMatches.length;
          content = content.replace(squareRe, safeVal);
        }
        const curlyRe = new RegExp(
          '\\{\\{(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*\\}\\}',
          'gi',
        );
        const curlyMatches = content.match(curlyRe);
        if (curlyMatches) {
          total += curlyMatches.length;
          content = content.replace(curlyRe, safeVal);
        }
        const angleRe = new RegExp(
          '<<(?:<[^>]+>)*' + innerPattern + '(?:<[^>]+>)*>>',
          'gi',
        );
        const angleMatches = content.match(angleRe);
        if (angleMatches) {
          total += angleMatches.length;
          content = content.replace(angleRe, safeVal);
        }
        const exactPattern = Array.from(alias)
          .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('(?:<[^>]+>)*');
        const exactRe = new RegExp(exactPattern, 'gi');
        const exactMatches = content.match(exactRe);
        if (exactMatches) {
          total += exactMatches.length;
          content = content.replace(exactRe, safeVal);
        }
      }
    }
    zip.file(name, content);
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { buffer, count: total };
};

export interface BatchFillResult {
  zipBuffer: Buffer;
  totalReplacements: number;
  results: Array<{
    name: string;
    buffer: Buffer | null;
    count: number;
    error?: boolean;
    errorMessage?: string;
  }>;
}

/**
 * Batch processes multiple .docx files and generates a single zip archive.
 */
export const batchFillAndZip = async (
  files: Array<{ name: string; buffer: Buffer; replacements?: ReplacementItem[] }>,
  replacements: ReplacementItem[],
): Promise<BatchFillResult> => {
  const zip = new JSZip();
  let totalReplacements = 0;
  const results: BatchFillResult['results'] = [];
  for (const file of files) {
    try {
      const effectiveReplacements = file.replacements ?? replacements;
      const { buffer, count } = await fillOneDocx(file.buffer, effectiveReplacements);
      totalReplacements += count;
      results.push({ name: file.name, buffer, count });
      const cleanName = file.name.replace(/^DA_DIEN_/i, '');
      zip.file(`DA_DIEN_${cleanName}`, buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fill docx';
      results.push({
        name: file.name,
        buffer: null,
        count: 0,
        error: true,
        errorMessage: message,
      });
    }
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return { zipBuffer, totalReplacements, results };
};
