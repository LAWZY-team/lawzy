import { Injectable, Logger } from '@nestjs/common';

const MIN_TEXT_LENGTH_FOR_OCR_SKIP = 200;
const PDF_PROBE_BYTES = 4096;

interface OcrResult {
  text: string;
  confidence: number;
}

function bufferLooksLikePdf(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  const probe = buffer.subarray(0, Math.min(buffer.length, PDF_PROBE_BYTES));
  return probe.toString('latin1').includes('%PDF-');
}

function bufferLooksLikeHtml(buffer: Buffer): boolean {
  const n = Math.min(buffer.length, 256);
  if (n < 2) return false;
  const s = buffer.subarray(0, n).toString('latin1').trimStart().toLowerCase();
  return (
    s.startsWith('<!') ||
    s.startsWith('<html') ||
    s.startsWith('<?xml') ||
    s.startsWith('<head')
  );
}

/** Tesseract chỉ an toàn với ảnh raster; PDF/HTML/octet khác có thể gây uncaught trong worker. */
function bufferLooksLikeRasterImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return true;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return true;
  const g = buffer.subarray(0, 6).toString('ascii');
  if (g.startsWith('GIF87a') || g.startsWith('GIF89a')) return true;
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return true;
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return true;
  const le =
    buffer[0] === 0x49 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x2a &&
    buffer[3] === 0;
  const be =
    buffer[0] === 0x4d &&
    buffer[1] === 0x4d &&
    buffer[2] === 0 &&
    buffer[3] === 0x2a;
  return le || be;
}

@Injectable()
export class OcrExtractor {
  private readonly logger = new Logger(OcrExtractor.name);

  /**
   * Check if extracted text is too short/empty (likely scanned PDF)
   * and OCR is needed.
   */
  needsOcr(extractedText: string): boolean {
    const cleaned = extractedText.replace(/\s+/g, ' ').trim();
    return cleaned.length < MIN_TEXT_LENGTH_FOR_OCR_SKIP;
  }

  /**
   * OCR raster images (PNG/JPEG, etc.) via Tesseract.js (vie+eng).
   * Raw PDF buffers are skipped: tesseract.js in Node triggers worker errors
   * ("Pdf reading is not supported") that can surface as process-level uncaught
   * exceptions, not Promise rejections. Use a PDF→image pipeline separately if needed.
   */
  async ocrFromBuffer(buffer: Buffer): Promise<OcrResult> {
    if (bufferLooksLikePdf(buffer)) {
      this.logger.warn(
        'OCR skipped: buffer is PDF — Tesseract in Node cannot ingest PDF safely here; keeping extracted text only.',
      );
      return { text: '', confidence: 0 };
    }
    if (bufferLooksLikeHtml(buffer)) {
      this.logger.warn(
        'OCR skipped: buffer looks like HTML/XML (e.g. error or redirect page), not an image.',
      );
      return { text: '', confidence: 0 };
    }
    if (!bufferLooksLikeRasterImage(buffer)) {
      this.logger.warn(
        'OCR skipped: buffer is not a known raster image (PNG/JPEG/GIF/WebP/BMP/TIFF); avoiding Tesseract worker crash.',
      );
      return { text: '', confidence: 0 };
    }
    const Tesseract = await import('tesseract.js');
    type WorkerType = Awaited<ReturnType<(typeof Tesseract)['createWorker']>>;
    let worker: WorkerType | undefined;
    try {
      worker = await Tesseract.createWorker('vie+eng', undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const {
        data: { text, confidence },
      } = await worker.recognize(buffer);
      return {
        text: text?.trim() || '',
        confidence: confidence || 0,
      };
    } catch (err) {
      this.logger.warn(`OCR failed: ${err}`);
      return { text: '', confidence: 0 };
    } finally {
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }
    }
  }
}
