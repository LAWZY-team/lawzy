import { PDFParse } from 'pdf-parse';
import { convert } from '@opendataloader/pdf';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

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
    const text = (stdout || '').trim();
    if (!text) {
      throw new Error('Produced empty text');
    }

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
