import { PDFParse } from 'pdf-parse';
import { convert } from '@opendataloader/pdf';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

function cleanOpenDataLoaderMarkdown(text: string): string {
  let cleaned = text;

  // We KEEP markdown headings (#, ##) and list bullets (-) 
  // and We ALSO keep bold/italic markup (**text**) since build-contract-template-json.ts now handles it!

  // 2. Fix National Motto formatting
  // Sometimes it merges into: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM ĐỘC LẬP – TỰ DO –\nHẠNH PHÚC"
  const mottoRegex = /(cộng h[oò]à xã hội chủ nghĩa việt nam)\s*(độc lập\s*[-–]\s*tự do\s*[-–]\s*hạnh phúc)/gi;
  cleaned = cleaned.replace(mottoRegex, (match, p1, p2) => {
    return `${p1.toUpperCase()}\nĐộc lập - Tự do - Hạnh phúc`;
  });

  return cleaned;
}

/**
 * Extract plain text and page count from a PDF buffer.
 * Attempts to use high-quality layout-aware @opendataloader/pdf (Java required).
 * If Java is not available on local dev machine, falls back to pdf-parse.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const tmpDir = os.tmpdir();
  const tmpFilePath = path.join(tmpDir, `${randomUUID()}.pdf`);
  
  await fs.writeFile(tmpFilePath, buffer);
  
  try {
    // Run the java-based parser
    const stdout = await convert(tmpFilePath, {
      format: 'markdown',
      toStdout: true,
      quiet: true,
    });
    
    // Convert output from java parser
    let text = (stdout || '').trim();
    if (!text) {
      throw new Error('Produced empty text');
    }

    // Clean up markdown artifacts and specific Vietnamese formats
    text = cleanOpenDataLoaderMarkdown(text);

    // Since we use markdown stdout mode, we estimate page count
    return {
      text,
      pageCount: Math.max(1, Math.ceil(text.length / 3000)),
    };
  } catch (error: any) {
    console.warn('[PDF Extraction] @opendataloader/pdf failed or Java missing.', error.message);
    console.warn('[PDF Extraction] Falling back to default pdf-parse...');
    
    // Fallback logic
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
  } finally {
    await fs.unlink(tmpFilePath).catch(() => {});
  }
}
