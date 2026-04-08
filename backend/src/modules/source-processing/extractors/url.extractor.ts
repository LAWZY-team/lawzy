import { Injectable, Logger } from '@nestjs/common';
import { extractTextFromPdfBuffer } from './parse-pdf-buffer';

interface ExtractionResult {
  text: string;
  pageCount: number;
}

@Injectable()
export class UrlExtractor {
  private readonly logger = new Logger(UrlExtractor.name);

  async extract(url: string): Promise<ExtractionResult> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lawzy/1.0; +https://lawzy.vn)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${url}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/pdf')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return extractTextFromPdfBuffer(buffer);
    }

    const html = await response.text();
    const text = this.extractTextFromHtml(html);
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pageCount: estimatedPages };
  }

  private extractTextFromHtml(html: string): string {
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

    text = text
      .replace(/<\/?(h[1-6]|p|div|br|li|tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    return text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .trim();
  }
}
