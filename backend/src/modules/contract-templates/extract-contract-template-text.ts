import * as mammoth from 'mammoth';
import { extractTextFromPdfBuffer } from '../source-processing/extractors/parse-pdf-buffer';

export interface ExtractedContractTemplateText {
  text: string;
  pageCount: number;
  detectedMimeType: string;
  fileExtension: '.pdf' | '.docx';
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
  const result = await mammoth.extractRawText({ buffer: params.buffer });
  const text = result.value?.trim() || '';
  return {
    text,
    pageCount: Math.max(1, Math.ceil(text.length / 3000)),
    detectedMimeType:
      params.contentType ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileExtension,
  };
};
