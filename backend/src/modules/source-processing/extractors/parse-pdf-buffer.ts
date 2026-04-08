import { PDFParse } from 'pdf-parse';

/**
 * Extract plain text and page count from a PDF buffer using pdf-parse v2 API.
 * v1 used `require('pdf-parse')(buffer)`; v2 uses `PDFParse` + `getText()`.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text ?? '').trim();
    const fromTotal =
      typeof result.total === 'number' && result.total > 0 ? result.total : 0;
    const fromPages = Array.isArray(result.pages) ? result.pages.length : 0;
    const pageCount = fromTotal > 0 ? fromTotal : fromPages;
    return { text, pageCount };
  } finally {
    await parser.destroy();
  }
}
