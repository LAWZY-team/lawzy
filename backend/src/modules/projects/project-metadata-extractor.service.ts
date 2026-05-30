import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { SourceProcessingService } from '../source-processing/source-processing.service';

@Injectable()
export class ProjectMetadataExtractorService {
  private readonly logger = new Logger(ProjectMetadataExtractorService.name);

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
    
    // Nếu là string, thử parse
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
   * Thực hiện trích xuất thông tin dự án bằng AI
   */
  async extractMetadata(documentId: string): Promise<any> {
    this.logger.log(`Bắt đầu trích xuất metadata bằng AI cho Document: ${documentId}`);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    let extractedText = '';

    // 1. Kiểm tra xem có tệp đính kèm vật lý (PDF/Word) không
    const attachedFile = await this.prisma.file.findFirst({
      where: {
        documentId,
        category: 'input_upload',
      },
    });

    if (attachedFile) {
      this.logger.log(`Tìm thấy tệp đính kèm vật lý: ${attachedFile.name}. Tiến hành đọc tệp...`);
      try {
        let fileType = 'pdf';
        if (attachedFile.mimeType.includes('officedocument') || attachedFile.mimeType.includes('word') || attachedFile.name.endsWith('.docx') || attachedFile.name.endsWith('.doc')) {
          fileType = 'docx';
        } else if (attachedFile.name.endsWith('.txt')) {
          fileType = 'txt';
        }
        
        const extracted = await this.sourceProcessing.extractText({
          type: fileType,
          s3Key: attachedFile.s3Key,
          sourceUrl: null,
        });
        extractedText = extracted.text;
      } catch (err: any) {
        this.logger.error(`Lỗi trích xuất text từ tệp R2: ${err.message}`);
      }
    }

    // 2. Fallback sang đọc contentJSON của TipTap Editor
    if (!extractedText && doc.contentJSON) {
      this.logger.log('Không có tệp đính kèm, trích xuất văn bản từ Editor contentJSON...');
      extractedText = this.extractTextFromTipTap(doc.contentJSON);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      this.logger.warn(`Không tìm thấy nội dung văn bản cho Document ${documentId}. Bỏ qua trích xuất.`);
      return null;
    }

    // Chỉ lấy 8000 ký tự đầu tiên (đại diện khoảng 3 trang đầu) để tránh quá tải token
    const textToAnalyze = extractedText.substring(0, 8000);

    // 3. Gọi Gemini AI để trích xuất thực thể
    const prompt = `Bạn là trợ lý pháp lý AI chuyên nghiệp.
Hãy phân tích nội dung văn bản dưới đây (ở định dạng hợp đồng hoặc quyết định) và trích xuất các biến cấu trúc sau dưới dạng JSON:
{
  "projectName": "Tên dự án liên quan (ví dụ: Nhà máy điện mặt trời Gia Lai, hoặc null nếu không đề cập)",
  "developerName": "Tên chủ đầu tư / Bên giao / Bên A (hoặc null nếu không tìm thấy)",
  "contractorName": "Tên nhà thầu / Bên nhận / Bên B (hoặc null nếu không tìm thấy)",
  "capacity": "Công suất dự án (ví dụ: 50MWp, 100kWp, hoặc null nếu không đề cập)",
  "location": "Địa điểm thực hiện dự án (ví dụ: Tỉnh Gia Lai, Việt Nam, hoặc null)",
  "contractNumber": "Số hiệu hợp đồng hoặc quyết định (ví dụ: 15/2026/HĐ-GP, hoặc null nếu không đề cập)",
  "legalBases": [
    "Danh sách các căn cứ pháp lý được đề cập ở lời mở đầu hoặc nội dung (ví dụ: Nghị định 06/2021/NĐ-CP, Luật Xây dựng 2014)"
  ]
}

Chỉ trả về mã JSON hợp lệ theo schema trên. Tuyệt đối không thêm bất cứ từ giải thích hay ký hiệu markdown nào.

Nội dung văn bản:
${textToAnalyze}`;

    try {
      this.logger.log('Gửi yêu cầu tới Gemini để trích xuất metadata...');
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

      const parsedMetadata = JSON.parse(jsonText.trim());
      
      // Đồng bộ thông tin vào Document Metadata trong DB
      const currentMetadata = (doc.metadata as Record<string, any>) || {};
      const updatedMetadata = {
        ...currentMetadata,
        projectName: parsedMetadata.projectName || currentMetadata.projectName || null,
        developerName: parsedMetadata.developerName || currentMetadata.developerName || null,
        contractorName: parsedMetadata.contractorName || currentMetadata.contractorName || null,
        capacity: parsedMetadata.capacity || currentMetadata.capacity || null,
        location: parsedMetadata.location || currentMetadata.location || null,
        contractNumber: parsedMetadata.contractNumber || currentMetadata.contractNumber || null,
        legalBases: parsedMetadata.legalBases || currentMetadata.legalBases || [],
      };

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: updatedMetadata,
        },
      });

      this.logger.log(`Trích xuất và lưu thành công metadata cho document: ${documentId}`);
      return updatedMetadata;
    } catch (err: any) {
      this.logger.error(`Gặp lỗi khi xử lý AI trích xuất metadata: ${err.message}`);
      // Lưu vết lỗi vào metadata để người dùng biết và không crash tiến trình
      const currentMetadata = (doc.metadata as Record<string, any>) || {};
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: {
            ...currentMetadata,
            error: `AI Metadata extraction error: ${err.message}`,
          },
        },
      });
      return null;
    }
  }
}
