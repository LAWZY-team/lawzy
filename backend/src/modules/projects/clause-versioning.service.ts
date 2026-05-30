import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';

@Injectable()
export class ClauseVersioningService {
  private readonly logger = new Logger(ClauseVersioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  /**
   * Đệ quy tìm tất cả các block clause trong TipTap JSON
   */
  private findClauses(node: any): any[] {
    if (!node) return [];
    
    if (typeof node === 'string') {
      try {
        node = JSON.parse(node);
      } catch {
        return [];
      }
    }
    
    let clauses: any[] = [];
    if (node.type === 'clause' && node.attrs && node.attrs.id) {
      clauses.push({
        id: node.attrs.id,
        title: node.attrs.title || '',
        text: this.extractTextOfNode(node),
        node: node,
      });
    }
    
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        clauses = clauses.concat(this.findClauses(child));
      }
    }
    return clauses;
  }

  /**
   * Trích xuất văn bản thô bên trong một Node
   */
  private extractTextOfNode(node: any): string {
    let text = '';
    if (node.text) {
      text += node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      text += node.content.map((child) => this.extractTextOfNode(child)).join(' ');
    }
    return text;
  }

  /**
   * Đệ quy tìm và cập nhật trạng thái của Clause Node trong cây JSON của TipTap
   */
  private updateClauseNodeInTree(
    node: any,
    targetClauseId: string,
    childDocId: string,
    sourceClauseId: string,
  ): boolean {
    if (!node) return false;
    
    if (typeof node === 'string') {
      try {
        node = JSON.parse(node);
      } catch {
        return false;
      }
    }

    if (node.type === 'clause' && node.attrs && node.attrs.id === targetClauseId) {
      node.attrs.status = 'superseded';
      node.attrs.supersededByDocumentId = childDocId;
      node.attrs.supersededByClauseId = sourceClauseId;
      return true;
    }
    
    if (node.content && Array.isArray(node.content)) {
      let updated = false;
      for (const child of node.content) {
        if (this.updateClauseNodeInTree(child, targetClauseId, childDocId, sourceClauseId)) {
          updated = true;
        }
      }
      return updated;
    }
    return false;
  }

  /**
   * Phân tích và tạo ánh xạ điều khoản giữa hợp đồng chính (Parent) và phụ lục (Child)
   */
  async analyzeAndMapClauses(parentDocId: string, childDocId: string): Promise<any[]> {
    this.logger.log(`Bắt đầu phân tích điều khoản giữa Parent: ${parentDocId} và Child: ${childDocId}`);

    const [parentDoc, childDoc] = await Promise.all([
      this.prisma.document.findUnique({ where: { id: parentDocId } }),
      this.prisma.document.findUnique({ where: { id: childDocId } }),
    ]);

    if (!parentDoc || !childDoc) {
      this.logger.warn('Không tìm thấy tài liệu gốc hoặc tài liệu phụ lục. Hủy phân tích.');
      return [];
    }

    const parentClauses = this.findClauses(parentDoc.contentJSON);
    const childClauses = this.findClauses(childDoc.contentJSON);

    if (parentClauses.length === 0 || childClauses.length === 0) {
      this.logger.warn(`Hợp đồng chính hoặc phụ lục không chứa Clause blocks nào. Bỏ qua phân tích.`);
      return [];
    }

    const prompt = `Bạn là trợ lý phân tích pháp lý AI chuyên nghiệp.
Nhiệm vụ của bạn là so sánh các điều khoản của Phụ lục (Child Document) với các điều khoản của Hợp đồng chính (Parent Document) để xác định xem điều khoản nào của Phụ lục sửa đổi/bổ sung/thay thế điều khoản nào của Hợp đồng chính.

Danh sách các điều khoản Hợp đồng chính (Parent):
${JSON.stringify(
  parentClauses.map((c) => ({ id: c.id, title: c.title, text: c.text })),
)}

Danh sách các điều khoản Phụ lục (Child):
${JSON.stringify(
  childClauses.map((c) => ({ id: c.id, title: c.title, text: c.text })),
)}

Hãy xác định mối liên kết và trả về kết quả dưới dạng mảng JSON duy nhất chứa các đối tượng có cấu trúc sau:
{
  "sourceClauseId": "ID của điều khoản trong Hợp đồng chính bị tác động (Parent)",
  "targetClauseId": "ID của điều khoản trong Phụ lục gây ra tác động (Child)",
  "sourceClauseKey": "Tiêu đề của điều khoản trong Hợp đồng chính bị tác động (Parent)",
  "targetClauseKey": "Tiêu đề của điều khoản trong Phụ lục gây ra tác động (Child)",
  "mappingType": "Loại tác động: 'supersedes' (thay thế hoàn toàn), 'modifies' (sửa đổi một phần), hoặc 'extends' (bổ sung mới)"
}

Chỉ trả về duy nhất mã JSON hợp lệ là một mảng, ví dụ:
[
  { "sourceClauseId": "parent-id-1", "targetClauseId": "child-id-1", "sourceClauseKey": "Điều 5. Đơn giá", "targetClauseKey": "Mục 2", "mappingType": "supersedes" }
]
Nếu không có bất kỳ sự thay đổi hay bổ sung nào, trả về mảng rỗng []`;

    try {
      this.logger.log('Gửi yêu cầu tới Gemini để phân tích ánh xạ điều khoản...');
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

      const mappings = JSON.parse(jsonText.trim());
      if (!Array.isArray(mappings) || mappings.length === 0) {
        this.logger.log('Không phát hiện thấy sự ánh xạ điều khoản nào từ AI.');
        return [];
      }

      this.logger.log(`AI phát hiện ${mappings.length} ánh xạ điều khoản.`);

      const createdMappings: any[] = [];
      let parentJsonUpdated = false;
      const parentJson = typeof parentDoc.contentJSON === 'string' 
        ? JSON.parse(parentDoc.contentJSON) 
        : JSON.parse(JSON.stringify(parentDoc.contentJSON)); // Deep clone

      for (const match of mappings) {
        // Tạo ánh xạ ClauseMapping trong DB
        const mapping = await this.prisma.clauseMapping.create({
          data: {
            sourceDocId: parentDocId,
            targetDocId: childDocId,
            sourceClauseId: match.sourceClauseId,
            targetClauseId: match.targetClauseId,
            sourceClauseKey: match.sourceClauseKey || '',
            targetClauseKey: match.targetClauseKey || '',
            mappingType: match.mappingType || 'modifies',
            status: 'active',
          },
        });
        createdMappings.push(mapping);

        // Cập nhật trạng thái Node Clause trong Parent JSON nếu loại là ghi đè/sửa đổi
        if (match.mappingType === 'supersedes' || match.mappingType === 'modifies') {
          const success = this.updateClauseNodeInTree(
            parentJson,
            match.sourceClauseId,
            childDocId,
            match.targetClauseId,
          );
          if (success) {
            parentJsonUpdated = true;
          }
        }
      }

      // Lưu lại cây JSON mới của Hợp đồng chính vào DB
      if (parentJsonUpdated) {
        await this.prisma.document.update({
          where: { id: parentDocId },
          data: { contentJSON: parentJson },
        });
        this.logger.log(`Đã cập nhật thành công trạng thái superseded cho các điều khoản bị ghi đè trong Hợp đồng gốc.`);
      }

      return createdMappings;
    } catch (err: any) {
      this.logger.error(`Lỗi phân tích đè phiên bản điều khoản: ${err.message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách ánh xạ điều khoản của tệp tin
   */
  async getClauseMappings(documentId: string): Promise<any[]> {
    return this.prisma.clauseMapping.findMany({
      where: {
        OR: [
          { sourceDocId: documentId },
          { targetDocId: documentId },
        ],
      },
      include: {
        sourceDoc: { select: { id: true, title: true } },
        targetDoc: { select: { id: true, title: true } },
      },
    });
  }
}
