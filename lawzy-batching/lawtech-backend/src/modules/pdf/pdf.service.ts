import { Injectable } from '@nestjs/common';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

@Injectable()
export class PdfService {
  async convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
    try {
      const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
      return pdfBuffer as Buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PDF conversion failed: ${message}`);
    }
  }
}
