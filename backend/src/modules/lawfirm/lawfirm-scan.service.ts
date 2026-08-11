import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';
import { extractTextFromPdfBuffer } from '../source-processing/extractors/parse-pdf-buffer';
import {
  analyzeDocxPlaceholders,
  cleanPlaceholderLabel,
  extractDocxPlainText,
  extractPlaceholders,
  guessCanonicalMapping,
} from './utils/lawfirm-placeholder-detector';
import { LawfirmR2Helper } from './utils/lawfirm-r2.helper';
import {
  LAWFIRM_DOCX_MIME,
  LAWFIRM_DOC_MIME,
  LAWFIRM_IDENTITY_MIMES,
  LAWFIRM_MAX_UPLOAD_BYTES,
  LAWFIRM_PDF_MIME,
  LAWFIRM_TEMPLATE_MIMES,
} from './lawfirm.constants';
import { toCurrentLawfirmProfileFieldKey } from './lawfirm-field-taxonomy';

export interface TemplateScanSuggestion {
  placeholder: string;
  mappedKey: string;
  label: string;
  confidence: number;
  source: 'deterministic' | 'ai';
}

export interface IdentityFieldSuggestion {
  fieldKey: string;
  label: string;
  value: string;
  confidence: number;
  source: string;
}

export interface IdentityExtractionResult {
  suggestions: IdentityFieldSuggestion[];
  provenance: Record<string, unknown>;
}

@Injectable()
export class LawfirmScanService {
  private readonly logger = new Logger(LawfirmScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly aiProvider: AiProviderService,
    private readonly sourceProcessing: SourceProcessingService,
    private readonly r2Helper: LawfirmR2Helper,
  ) {}

  validateMimeAndSize(
    mimeType: string,
    size: number,
    allowed: readonly string[],
  ): void {
    if (size > LAWFIRM_MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum size of ${LAWFIRM_MAX_UPLOAD_BYTES} bytes`,
      );
    }
    if (!allowed.includes(mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}`);
    }
  }

  async scanTemplateDocument(
    userId: string,
    documentId: string,
    options?: { useAi?: boolean },
  ): Promise<{
    deterministic: TemplateScanSuggestion[];
    ai: TemplateScanSuggestion[];
  }> {
    const document = await this.prisma.lawfirmTemplateDocument.findUnique({
      where: { id: documentId },
      include: { templateSet: true },
    });
    if (!document) {
      throw new NotFoundException('Template document not found');
    }
    await this.assertTemplateSetReadable(
      userId,
      document.templateSet.workspaceId,
      document.templateSet.visibility,
    );
    const buffer = await this.r2Helper.downloadBuffer(document.storageKey);
    const plainText =
      document.plainText ||
      (document.fileType === 'docx'
        ? (await analyzeDocxPlaceholders(buffer))
            .map((field) => field.placeholder)
            .join(' ')
        : '');
    const placeholders = extractPlaceholders(plainText);
    const deterministic: TemplateScanSuggestion[] = placeholders.map(
      (placeholder) => ({
        placeholder,
        mappedKey: guessCanonicalMapping(placeholder),
        label: cleanPlaceholderLabel(placeholder),
        confidence: 1,
        source: 'deterministic',
      }),
    );
    let ai: TemplateScanSuggestion[] = [];
    if (options?.useAi && plainText.trim().length > 0) {
      ai = await this.suggestTemplateMappings(plainText);
    }
    return { deterministic, ai };
  }

  private async suggestTemplateMappings(
    plainText: string,
  ): Promise<TemplateScanSuggestion[]> {
    const textToAnalyze = plainText.substring(0, 8000);
    const prompt = `Bạn là trợ lý pháp lý AI. Phân tích văn bản mẫu hồ sơ pháp lý và đề xuất ánh xạ placeholder sang field key chuẩn.
Trả về JSON theo schema:
{
  "fields": [
    {
      "placeholder": "[TÊN DOANH NGHIỆP]",
      "mappedKey": "f_to_ten",
      "label": "Tên doanh nghiệp",
      "confidence": 0.9
    }
  ]
}
Chỉ trả về JSON hợp lệ, không markdown.

Nội dung:
${textToAnalyze}`;
    try {
      const response = await this.aiProvider.generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const jsonText =
        response.text ||
        (
          response as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          }
        ).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return [];
      const parsed = JSON.parse(jsonText.trim()) as {
        fields?: Array<{
          placeholder?: string;
          mappedKey?: string;
          label?: string;
          confidence?: number;
        }>;
      };
      return (parsed.fields ?? [])
        .filter((field) => Boolean(field.placeholder))
        .map((field) => ({
          placeholder: String(field.placeholder),
          mappedKey:
            toCurrentLawfirmProfileFieldKey(String(field.mappedKey ?? '')) ??
            guessCanonicalMapping(String(field.placeholder)),
          label: String(field.label ?? field.placeholder),
          confidence:
            typeof field.confidence === 'number' ? field.confidence : 0.7,
          source: 'ai' as const,
        }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI template scan failed: ${message}`);
      return [];
    }
  }

  async extractIdentityFromUpload(params: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
    storageKey: string;
  }): Promise<IdentityExtractionResult> {
    this.validateMimeAndSize(
      params.mimeType,
      params.buffer.length,
      LAWFIRM_IDENTITY_MIMES,
    );
    let extractedText = '';
    if (params.mimeType === LAWFIRM_PDF_MIME) {
      const result = await this.sourceProcessing.extractText({
        type: 'pdf',
        s3Key: params.storageKey,
        sourceUrl: null,
      });
      extractedText = result.text;
    } else {
      return this.extractIdentityFromImage(params);
    }
    if (!extractedText.trim()) {
      return {
        suggestions: [],
        provenance: {
          fileName: params.fileName,
          mimeType: params.mimeType,
          storageKey: params.storageKey,
          note: 'No text extracted',
        },
      };
    }
    return this.extractIdentityFromText(extractedText, {
      fileName: params.fileName,
      mimeType: params.mimeType,
      storageKey: params.storageKey,
    });
  }

  private async extractIdentityFromImage(params: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
    storageKey: string;
  }): Promise<IdentityExtractionResult> {
    const provenanceBase = {
      fileName: params.fileName,
      mimeType: params.mimeType,
      storageKey: params.storageKey,
      extractionMethod: 'gemini_multimodal',
    };
    const prompt = `Bạn là trợ lý pháp lý AI. Đọc trực tiếp ảnh giấy tờ định danh (CCCD, hộ chiếu, ĐKKD, MST) và trích xuất thông tin nhìn thấy rõ.
Trả về JSON theo schema:
{
  "fields": [
    {
      "fieldKey": "f_cn_hoten",
      "label": "Họ và tên",
      "value": "NGUYEN VAN A",
      "confidence": 0.95,
      "source": "cccd_front"
    }
  ],
  "provenance": {
    "documentType": "cccd",
    "pages": [1]
  }
}
fieldKey gợi ý: f_cn_hoten, f_cn_cccd, f_cn_ngaysinh, f_cn_quoctich, f_cn_diachi, f_to_ten, f_to_mst, f_to_diachi, f_dd_hoten, f_dd_chucdanh.
Không suy đoán dữ liệu bị che hoặc không đọc được. Chỉ trả về JSON hợp lệ. KHÔNG tự động áp dụng — chỉ đề xuất.`;
    try {
      const response = await this.aiProvider.generateContentWithRetry({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: params.mimeType,
                  data: params.buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        config: { responseMimeType: 'application/json' },
      });
      const jsonText =
        response.text ||
        (
          response as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          }
        ).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        return { suggestions: [], provenance: provenanceBase };
      }
      const parsed = JSON.parse(jsonText.trim()) as {
        fields?: IdentityFieldSuggestion[];
        provenance?: Record<string, unknown>;
      };
      return {
        suggestions: (parsed.fields ?? []).filter((field) =>
          Boolean(field.fieldKey && field.value),
        ),
        provenance: { ...provenanceBase, ...(parsed.provenance ?? {}) },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI identity image extraction failed: ${message}`);
      return {
        suggestions: [],
        provenance: { ...provenanceBase, error: message },
      };
    }
  }

  async extractIdentityFromText(
    text: string,
    provenanceBase: Record<string, unknown>,
  ): Promise<IdentityExtractionResult> {
    const textToAnalyze = text.substring(0, 12000);
    const prompt = `Bạn là trợ lý pháp lý AI. Trích xuất thông tin định danh từ giấy tờ (CCCD, hộ chiếu, ĐKKD, MST).
Trả về JSON theo schema:
{
  "fields": [
    {
      "fieldKey": "f_cn_hoten",
      "label": "Họ và tên",
      "value": "NGUYEN VAN A",
      "confidence": 0.95,
      "source": "cccd_front"
    }
  ],
  "provenance": {
    "documentType": "cccd",
    "pages": [1]
  }
}
fieldKey gợi ý: f_cn_hoten, f_cn_cccd, f_cn_ngaysinh, f_to_ten, f_to_mst, f_to_diachi, f_dd_hoten, f_dd_chucdanh.
Chỉ trả về JSON hợp lệ. KHÔNG tự động áp dụng — chỉ đề xuất.

Nội dung OCR/text:
${textToAnalyze}`;
    try {
      const response = await this.aiProvider.generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const jsonText =
        response.text ||
        (
          response as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          }
        ).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        return { suggestions: [], provenance: provenanceBase };
      }
      const parsed = JSON.parse(jsonText.trim()) as {
        fields?: IdentityFieldSuggestion[];
        provenance?: Record<string, unknown>;
      };
      return {
        suggestions: (parsed.fields ?? []).filter((field) =>
          Boolean(field.fieldKey && field.value),
        ),
        provenance: { ...provenanceBase, ...(parsed.provenance ?? {}) },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI identity extraction failed: ${message}`);
      return {
        suggestions: [],
        provenance: { ...provenanceBase, error: message },
      };
    }
  }

  async analyzeUploadedTemplateFile(params: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<{
    fileType: 'docx' | 'pdf';
    plainText: string;
    fields: Array<{
      label: string;
      placeholder: string;
      mappedKey: string;
      count: number;
    }>;
  }> {
    this.validateMimeAndSize(
      params.mimeType,
      params.buffer.length,
      LAWFIRM_TEMPLATE_MIMES,
    );
    const lowerName = params.fileName.toLowerCase();
    if (
      params.mimeType === LAWFIRM_DOCX_MIME ||
      params.mimeType === LAWFIRM_DOC_MIME ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc')
    ) {
      const plainText = await extractDocxPlainText(params.buffer);
      const fields = await analyzeDocxPlaceholders(params.buffer);
      return { fileType: 'docx', plainText, fields };
    }
    const pdfResult = await extractTextFromPdfBuffer(params.buffer);
    const plainText = pdfResult.text;
    const placeholders = extractPlaceholders(plainText);
    const fields = placeholders.map((placeholder) => ({
      label: cleanPlaceholderLabel(placeholder) || 'Trường thông tin',
      placeholder,
      mappedKey: guessCanonicalMapping(placeholder),
      count: 1,
    }));
    return { fileType: 'pdf', plainText, fields };
  }

  private async assertTemplateSetReadable(
    userId: string,
    workspaceId: string,
    visibility: string,
  ): Promise<void> {
    const isOwnerMember = await this.workspaceAccess.hasMembership(
      workspaceId,
      userId,
    );
    if (isOwnerMember) {
      await this.workspaceAccess.requireMembership(workspaceId, userId);
      return;
    }
    if (visibility !== 'public') {
      throw new NotFoundException('Not found');
    }
  }
}
