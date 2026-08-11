import JSZip from 'jszip';
import { resolveCurrentProfileFieldKey } from '../lawfirm-field-taxonomy';

export function extractDocBinaryText(buffer: Buffer | ArrayBuffer): string {
  const uint8 =
    buffer instanceof Buffer
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
  const textPieces: string[] = [];

  let utf16Str = '';
  for (let i = 0; i < uint8.length - 1; i += 2) {
    const charCode = uint8[i] | (uint8[i + 1] << 8);
    if (
      (charCode >= 0x0020 &&
        charCode <= 0x1ef9 &&
        charCode !== 0xfeff &&
        charCode !== 0xffff) ||
      charCode === 10 ||
      charCode === 13 ||
      charCode === 9
    ) {
      utf16Str += String.fromCharCode(charCode);
    } else {
      if (utf16Str.trim().length >= 3) {
        textPieces.push(utf16Str);
      }
      utf16Str = '';
    }
  }
  if (utf16Str.trim().length >= 3) {
    textPieces.push(utf16Str);
  }

  const rawUtf8 = Buffer.from(uint8).toString('utf-8');
  const utf8Matches =
    rawUtf8.match(
      /[\w\s\u00C0-\u1EF9\[\]\{\}<>\:\-\_\,\.\?\!\%\$\@\#\&\*\(\)]{3,}/g,
    ) ?? [];

  const combined = [...textPieces, ...utf8Matches].join('\n');
  const cleanLines = combined
    .split(/[\r\n]+/)
    .map((line) =>
      line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim(),
    )
    .filter(
      (line) => line.length > 2 && /[\w\u00C0-\u1EF9\[\]\{\}<>]/.test(line),
    );

  return [...new Set(cleanLines)].join('\n\n');
}

/**
 * Extracts raw plain text from all XML components of a .docx file or fallback for legacy .doc binary files.
 */
export const extractDocxPlainText = async (
  buffer: Buffer | ArrayBuffer,
): Promise<string> => {
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const docBuffer =
      buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer));
    const extracted = await extractor.extract(docBuffer);
    const text = extracted.getBody();
    if (text && text.trim().length > 0) {
      return text.trim();
    }
  } catch {
    // Fall back if zip or word-extractor fails
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const xmlFileNames = Object.keys(zip.files).filter(
      (name) =>
        name === 'word/document.xml' ||
        name.startsWith('word/header') ||
        name.startsWith('word/footer'),
    );
    let totalText = '';
    for (const name of xmlFileNames) {
      const file = zip.file(name);
      if (!file) continue;
      const xmlString = await file.async('text');
      const textMatches = xmlString.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const cleaned = textMatches
          .map((tag) => tag.replace(/<[^>]+>/g, ''))
          .join(' ');
        totalText += ` ${cleaned}`;
      }
    }
    return totalText.trim();
  } catch {
    return extractDocBinaryText(buffer);
  }
};

/**
 * Detects all placeholders matching [...], {{...}}, or <<...>> in plain text.
 */
export const extractPlaceholders = (text: string): string[] => {
  if (!text) return [];
  const patterns = [
    /\[[^[\]\r\n]{1,80}\]/g,
    /\{\{[^{}\r\n]{1,80}\}\}/g,
    /<<[^<>\r\n]{1,80}>>/g,
    /\$\{[^{}\r\n]{1,80}\}/g,
    /\$\([^()\r\n]{1,80}\)/g,
    /\{[^{}\r\n]{2,80}\}/g,
    /<(?!\/?(p|div|span|h[1-6]|b|i|u|strong|table|tr|td|th|br|w:|xml|html|body|head|style|script)\b)[^<>\r\n]{2,80}>/gi,
  ];
  const matches = patterns.flatMap((pattern) => text.match(pattern) ?? []);
  return Array.from(
    new Set(
      matches.map((match) => match.trim()).filter((match) => match.length >= 3),
    ),
  ).sort();
};

export const cleanPlaceholderLabel = (value: string): string =>
  value
    .replace(/^(\$\{|\$\(|\{\{|<<|\[|\{|\<)/, '')
    .replace(/(\}\}|\}\)|\}\||>>|\]|\}|\>)$/, '')
    .trim();

export const countOccurrences = (text: string, value: string): number =>
  text.match(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    ?.length ?? 0;

/**
 * Guesses the canonical key given a discovered placeholder string.
 */
export const guessCanonicalMapping = (placeholder: string): string => {
  return resolveCurrentProfileFieldKey(placeholder);
};

export const analyzeDocxPlaceholders = async (
  buffer: Buffer,
): Promise<
  Array<{
    label: string;
    placeholder: string;
    mappedKey: string;
    count: number;
  }>
> => {
  const plainText = await extractDocxPlainText(buffer);
  return extractPlaceholders(plainText).map((placeholder) => ({
    label: cleanPlaceholderLabel(placeholder) || 'Trường thông tin',
    placeholder,
    mappedKey: guessCanonicalMapping(placeholder),
    count: countOccurrences(plainText, placeholder),
  }));
};
