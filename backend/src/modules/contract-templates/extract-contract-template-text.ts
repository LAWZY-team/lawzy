import * as mammoth from 'mammoth';
import { extractTextFromPdfBuffer } from '../source-processing/extractors/parse-pdf-buffer';

export interface ExtractedContractTemplateText {
  text: string;
  pageCount: number;
  detectedMimeType: string;
  fileExtension: '.pdf' | '.docx';
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

function resolveFileExtension(fileName: string): '.pdf' | '.docx' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return '.pdf';
  if (lower.endsWith('.docx')) return '.docx';
  throw new Error('Only PDF and DOCX are supported');
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
      fileExtension,
    };
  }
  const [rawTextResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer: params.buffer }),
    mammoth.convertToHtml({ buffer: params.buffer }),
  ]);
  const structuredFromHtml = extractStructuredDocxTextFromHtml(htmlResult.value || '');
  const rawText = rawTextResult.value?.trim() || '';
  const text = structuredFromHtml || rawText;
  return {
    text,
    pageCount: Math.max(1, Math.ceil(text.length / 3000)),
    detectedMimeType:
      params.contentType ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileExtension,
  };
};
