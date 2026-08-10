import * as mammoth from 'mammoth';
import { extractTextFromPdfBuffer } from '../source-processing/extractors/parse-pdf-buffer';

export interface ExtractedContractTemplateText {
  text: string;
  pageCount: number;
  detectedMimeType: string;
  fileExtension: '.pdf' | '.docx' | '.doc';
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function htmlTableToMarkdown(tableHtml: string): string[] {
  const rowMatches = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  const rows = rowMatches
    .map((rowMatch) => {
      const cells = Array.from(
        rowMatch[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi),
      ).map((cellMatch) => {
        const withBreaks = cellMatch[2].replace(/<br\s*\/?>/gi, '\n');
        return stripHtmlTags(withBreaks);
      });
      return cells;
    })
    .filter((row) => row.length > 0);

  if (rows.length === 0) return [];

  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const paddedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: maxCols - row.length }, () => ''),
  ]);

  const out: string[] = [];
  out.push(`| ${paddedRows[0].join(' | ')} |`);
  out.push(`| ${Array.from({ length: maxCols }, () => '---').join(' | ')} |`);
  for (let index = 1; index < paddedRows.length; index += 1) {
    out.push(`| ${paddedRows[index].join(' | ')} |`);
  }
  return out;
}

export function extractStructuredDocxTextFromHtml(html: string): string {
  const blockRegex =
    /(<table\b[\s\S]*?<\/table>)|(<h[1-6]\b[\s\S]*?<\/h[1-6]>)|(<p\b[\s\S]*?<\/p>)|(<li\b[\s\S]*?<\/li>)/gi;
  const lines: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[0];
    if (/^<table\b/i.test(block)) {
      const tableLines = htmlTableToMarkdown(block);
      if (tableLines.length > 0) {
        lines.push(...tableLines, '');
      }
      continue;
    }

    const text = stripHtmlTags(block.replace(/<br\s*\/?>/gi, '\n'));
    if (text) lines.push(text);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function resolveFileExtension(fileName: string): '.pdf' | '.docx' | '.doc' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return '.pdf';
  if (lower.endsWith('.doc')) return '.doc';
  return '.docx';
}

export const extractContractTemplateText = async (params: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}): Promise<ExtractedContractTemplateText> => {
  const fileExtension = resolveFileExtension(params.fileName);
  if (fileExtension === '.pdf') {
    const result = await extractTextFromPdfBuffer(params.buffer);
    return {
      text: result.text,
      pageCount: result.pageCount,
      detectedMimeType: 'application/pdf',
      fileExtension: '.pdf',
    };
  }

  let text = '';
  try {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(params.buffer);
    text = extracted.getBody();
  } catch {
    // Fall back to mammoth or binary regex extraction
  }

  if (!text || text.trim().length === 0) {
    try {
      const mammothResult = await mammoth.extractRawText({ buffer: params.buffer });
      text = mammothResult.value;
    } catch {
      const uint8 = new Uint8Array(
        params.buffer.buffer.slice(params.buffer.byteOffset, params.buffer.byteOffset + params.buffer.byteLength),
      );
      const textPieces: string[] = [];
      let utf16Str = '';
      for (let i = 0; i < uint8.length - 1; i += 2) {
        const charCode = uint8[i] | (uint8[i + 1] << 8);
        if (
          (charCode >= 0x0020 && charCode <= 0x1ef9 && charCode !== 0xfeff && charCode !== 0xffff) ||
          charCode === 10 ||
          charCode === 13 ||
          charCode === 9
        ) {
          utf16Str += String.fromCharCode(charCode);
        } else {
          if (utf16Str.trim().length >= 3) textPieces.push(utf16Str);
          utf16Str = '';
        }
      }
      if (utf16Str.trim().length >= 3) textPieces.push(utf16Str);

      const raw = params.buffer.toString('utf-8');
      const matches = raw.match(/[\w\s\u00C0-\u1EF9\[\]\{\}<>\:\-\_\,\.\?\!\%\$\@\#\&\*\(\)]{3,}/g) ?? [];
      const combined = [...textPieces, ...matches].join('\n');
      const cleanLines = combined
        .split(/[\r\n]+/)
        .map((line) => line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim())
        .filter((line) => line.length > 2 && /[\w\u00C0-\u1EF9\[\]\{\}<>]/.test(line));
      text = [...new Set(cleanLines)].join('\n\n');
    }
  }

  return {
    text: text.trim(),
    pageCount: 1,
    detectedMimeType:
      fileExtension === '.doc'
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileExtension: fileExtension,
  };
};
