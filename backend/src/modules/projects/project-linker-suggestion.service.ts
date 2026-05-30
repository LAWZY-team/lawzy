import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';

@Injectable()
export class ProjectLinkerSuggestionService {
  private readonly logger = new Logger(ProjectLinkerSuggestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly sourceProcessing: SourceProcessingService,
  ) {}

  /**
   * Đệ quy trích xuất text từ cấu trúc JSON của TipTap
   */
  private extractTextFromTipTap(node: any): string {
    if (!node) return '';
    
    if (typeof node === 'string') {
      try {
        node = JSON.parse(node);
      } catch {
        return '';
      }
    }

    let text = '';
    if (node.text) {
      text += node.text;
    }
    
    if (node.content && Array.isArray(node.content)) {
      text += node.content.map((child) => this.extractTextFromTipTap(child)).join(' ');
    }
    
    return text;
  }

  /**
   * Trích xuất văn bản thô từ document
   */
  private async getDocumentText(documentId: string, doc: any): Promise<string> {
    // 1. Kiểm tra xem có tệp đính kèm vật lý (PDF/Word) không
    const attachedFile = await this.prisma.file.findFirst({
      where: {
        documentId,
        category: 'input_upload',
      },
    });

    if (attachedFile) {
      try {
        let fileType = 'pdf';
        if (
          attachedFile.mimeType.includes('officedocument') ||
          attachedFile.mimeType.includes('word') ||
          attachedFile.name.endsWith('.docx') ||
          attachedFile.name.endsWith('.doc')
        ) {
          fileType = 'docx';
        } else if (attachedFile.name.endsWith('.txt')) {
          fileType = 'txt';
        }
        
        const extracted = await this.sourceProcessing.extractText({
          type: fileType,
          s3Key: attachedFile.s3Key,
          sourceUrl: null,
        });
        return extracted.text;
      } catch (err: any) {
        this.logger.error(`Lỗi trích xuất text từ tệp R2 trong suggestion: ${err.message}`);
      }
    }

    // 2. Fallback sang contentJSON
    if (doc.contentJSON) {
      return this.extractTextFromTipTap(doc.contentJSON);
    }

    return '';
  }

  /**
   * Làm sạch và chuẩn hóa số hiệu hợp đồng để so khớp mờ (Fuzzy matching)
   */
  private cleanContractNumber(val: string): string {
    if (!val) return '';
    return val
      .toLowerCase()
      .replace(/(hợp đồng số|hđ số|số hiệu|hđ|hd|số|\s)/gi, '') // xóa chữ phụ và dấu cách
      .replace(/[^a-z0-9]/gi, '') // chỉ giữ alphanumeric
      .trim();
  }

  /**
   * Quét Preamble và sinh đề xuất liên kết
   */
  async generateSuggestions(documentId: string): Promise<any[]> {
    this.logger.log(`Bắt đầu chạy AI Suggestion Engine cho Document: ${documentId}`);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    const text = await this.getDocumentText(documentId, doc);
    if (!text || text.trim().length === 0) {
      this.logger.warn(`Không có nội dung văn bản cho Document ${documentId}. Bỏ qua đề xuất liên kết.`);
      return [];
    }

    // Chỉ quét 3000 ký tự đầu (phần mở đầu - preamble) nơi chứa thông tin tham chiếu hợp đồng gốc
    const preambleText = text.substring(0, 3000);

    const prompt = `Bạn là chuyên gia phân tích văn bản pháp lý.
Hãy đọc phần mở đầu (preamble) của văn bản dưới đây và xác định xem tài liệu này có phải là phụ lục hợp đồng, văn bản sửa đổi, văn bản hướng dẫn, hoặc biên bản nghiệm thu tham chiếu/kế thừa/ăn theo một Hợp đồng chính (hoặc Quyết định chính) gốc nào khác không.

Nếu có, hãy trích xuất:
1. 'isChild': true (nếu là phụ lục/văn bản kế thừa/nghiệm thu của hợp đồng khác), ngược lại là false.
2. 'referencedContractNumber': Số hiệu của Hợp đồng/Quyết định gốc được tham chiếu đến để sửa đổi hoặc nghiệm thu (ví dụ: '15/2026/HĐ-GP', hoặc null nếu không đề cập rõ).

Chỉ trả về JSON hợp lệ theo schema sau:
{
  "isChild": boolean,
  "referencedContractNumber": string | null
}

Nội dung phần mở đầu:
${preambleText}`;

    try {
      this.logger.log(`Gửi yêu cầu tới Gemini để phân tích preamble của document ${documentId}...`);
      const response = await this.aiProvider.generateContentWithRetry({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const jsonText = response.text || (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        throw new Error('AI returned empty response');
      }

      const parsed = JSON.parse(jsonText.trim());
      if (!parsed.isChild || !parsed.referencedContractNumber) {
        this.logger.log(`Tài liệu ${documentId} không phải là phụ lục hoặc không chứa số hiệu tham chiếu.`);
        return [];
      }

      const refNo = parsed.referencedContractNumber;
      this.logger.log(`AI phát hiện số hiệu hợp đồng gốc tham chiếu: ${refNo}`);

      // Thực hiện tìm kiếm các tài liệu khác trong cùng Workspace (hoặc cùng project) để đối chiếu
      const cleanRefNo = this.cleanContractNumber(refNo);
      if (!cleanRefNo) return [];

      const workspaceDocs = await this.prisma.document.findMany({
        where: {
          workspaceId: doc.workspaceId,
          id: { not: documentId },
          deletedAt: null,
        },
      });

      const matchedDocs = workspaceDocs.filter((d) => {
        const metadata = (d.metadata as Record<string, any>) || {};
        const docContractNo = metadata.contractNumber;
        if (!docContractNo) return false;
        return this.cleanContractNumber(docContractNo) === cleanRefNo;
      });

      if (matchedDocs.length === 0) {
        this.logger.log(`Không tìm thấy tài liệu gốc nào có số hiệu khớp với: ${refNo}`);
        return [];
      }

      const suggestionsCreated: any[] = [];

      for (const parentDoc of matchedDocs) {
        // Kiểm tra xem đã có liên kết nào tồn tại giữa 2 tài liệu này chưa
        const existingLink = await this.prisma.documentLink.findFirst({
          where: {
            sourceDocumentId: parentDoc.id,
            targetDocumentId: documentId,
            linkType: 'dependency',
          },
        });

        if (existingLink) {
          this.logger.log(`Liên kết giữa ${parentDoc.title} và ${doc.title} đã tồn tại với trạng thái: ${existingLink.status}`);
          continue;
        }

        // Tạo liên kết đề xuất với trạng thái 'ai_suggested'
        const newLink = await this.prisma.documentLink.create({
          data: {
            sourceDocumentId: parentDoc.id,
            targetDocumentId: documentId,
            linkType: 'dependency',
            status: 'ai_suggested',
            description: `AI phát hiện số hiệu hợp đồng gốc tham chiếu '${refNo}' trong phần mở đầu của phụ lục.`,
          },
          include: {
            sourceDocument: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
              },
            },
          },
        });

        this.logger.log(`Đã tạo liên kết đề xuất (ai_suggested) từ ${parentDoc.title} -> ${doc.title}`);
        suggestionsCreated.push(newLink);
      }

      return suggestionsCreated;
    } catch (err: any) {
      this.logger.error(`Lỗi sinh liên kết đề xuất bằng AI: ${err.message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách liên kết đề xuất của tài liệu
   */
  async getSuggestions(documentId: string, userId: string): Promise<any[]> {
    // Đảm bảo quyền truy cập tài liệu
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentLink.findMany({
      where: {
        targetDocumentId: documentId,
        status: 'ai_suggested',
      },
      include: {
        sourceDocument: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            metadata: true,
          },
        },
      },
    });
  }

  /**
   * Chấp nhận liên kết đề xuất
   */
  async acceptSuggestion(documentId: string, linkId: string, userId: string): Promise<any> {
    const link = await this.prisma.documentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link suggestion not found');
    }

    if (link.targetDocumentId !== documentId) {
      throw new NotFoundException('Link suggestion does not belong to this document');
    }

    // Cập nhật trạng thái liên kết thành 'active'
    const updatedLink = await this.prisma.documentLink.update({
      where: { id: linkId },
      data: { status: 'active' },
    });

    // Cập nhật cấu trúc cây trên Document (parentId)
    const parentDoc = await this.prisma.document.findUnique({
      where: { id: link.sourceDocumentId },
    });

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        parentId: link.sourceDocumentId,
        // Đồng bộ luôn projectId nếu hợp đồng gốc đã nằm trong một dự án
        ...(parentDoc?.projectId && { projectId: parentDoc.projectId }),
      },
    });

    this.logger.log(`Chấp nhận liên kết đề xuất ${linkId} thành công. Thiết lập parentId: ${link.sourceDocumentId}`);
    return updatedLink;
  }

  /**
   * Từ chối liên kết đề xuất
   */
  async rejectSuggestion(documentId: string, linkId: string, userId: string): Promise<any> {
    const link = await this.prisma.documentLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Link suggestion not found');
    }

    if (link.targetDocumentId !== documentId) {
      throw new NotFoundException('Link suggestion does not belong to this document');
    }

    // Cập nhật trạng thái liên kết thành 'ai_rejected' để không gợi ý lại
    const updatedLink = await this.prisma.documentLink.update({
      where: { id: linkId },
      data: { status: 'ai_rejected' },
    });

    this.logger.log(`Từ chối liên kết đề xuất ${linkId} thành công. Trạng thái cập nhật thành: ai_rejected`);
    return updatedLink;
  }
}
