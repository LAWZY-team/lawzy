import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../integrations/prisma/prisma.service';
import { AiProviderService } from '../../ai/ai-provider.service';

@Injectable()
export class AIJobObligationService {
  private readonly logger = new Logger(AIJobObligationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  /**
   * Đệ quy trích xuất văn bản thô từ TipTap JSON
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
   * Trích xuất nghĩa vụ tự động từ tài liệu bằng AI
   */
  async extractObligations(documentId: string): Promise<any[]> {
    this.logger.log(`[AIJobObligationService] Bắt đầu trích xuất nghĩa vụ bằng AI cho Document: ${documentId}`);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Lấy văn bản thô từ TipTap JSON
    let extractedText = '';
    if (doc.contentJSON) {
      extractedText = this.extractTextFromTipTap(doc.contentJSON);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      this.logger.warn(`[AIJobObligationService] Không có nội dung văn bản cho Document ${documentId}. Bỏ qua trích xuất.`);
      return [];
    }

    // Chỉ phân tích tối đa 10000 ký tự đầu tiên để tối ưu token
    const textToAnalyze = extractedText.substring(0, 10000);

    const prompt = `Bạn là chuyên gia phân tích pháp lý AI chuyên nghiệp.
Nhiệm vụ của bạn là đọc và phân tích nội dung văn bản dưới đây (hợp đồng hoặc quyết định) để bóc tách tất cả các cam kết, nghĩa vụ quan trọng của các bên.
Phân chia rõ 2 nhóm nghĩa vụ:
1. Nghĩa vụ Tài chính (Financial): các đợt thanh toán, đơn giá, phần trăm thanh toán, điều kiện kích hoạt thanh toán.
2. Nghĩa vụ Phi tài chính (Non-Financial): cam kết bảo hành (ví dụ: bảo hành tấm pin 20 năm, bảo hành inverter 5 năm...), nghiệm thu, bàn giao, bảo mật, vận chuyển.

Hãy trả về một mảng JSON chứa các đối tượng có cấu trúc chính xác như sau:
{
  "title": "Tên nghĩa vụ ngắn gọn (ví dụ: Thanh toán đợt 1, Bảo hành tuabin gió)",
  "description": "Mô tả chi tiết nội dung nghĩa vụ và điều kiện kèm theo",
  "dueDateOffsetDays": 30, // Số ngày đáo hạn tương đối ước tính kể từ ngày ký (ví dụ: thanh toán trong 30 ngày -> 30; bảo hành 5 năm -> 1825. Nếu không đề cập rõ hãy tự đề xuất hợp lý dựa vào tính chất nghĩa vụ)",
  "amount": 15000000.00, // Số tiền thanh toán (chỉ điền số thực nếu là nghĩa vụ tài chính, ngược lại để null)",
  "percentage": 10.5, // Phần trăm thanh toán (ví dụ: 10%, hoặc null nếu không đề cập)",
  "triggerCondition": "Điều kiện kích hoạt nghĩa vụ tài chính (ví dụ: sau khi bàn giao biên bản nghiệm thu, hoặc null)",
  "obligationType": "warranty" | "payment" | "inspection" | "delivery" | "other", // Chọn chính xác một trong các loại này
  "effectivePeriod": "Thời gian có hiệu lực của nghĩa vụ (ví dụ: 5 năm, 20 năm, hoặc null)",
  "responsibleVendor": "Bên chịu trách nhiệm thực hiện nghĩa vụ này (ví dụ: Bên B, Bên A, hoặc null)"
}

Chỉ trả về duy nhất mã JSON hợp lệ là một mảng [] theo schema trên. Tuyệt đối không thêm bất cứ từ giải thích, markdown hay ký tự nào ngoài JSON.

Nội dung văn bản:
${textToAnalyze}`;

    try {
      this.logger.log(`[AIJobObligationService] Gửi yêu cầu tới Gemini để bóc tách nghĩa vụ cho tài liệu ${documentId}...`);
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

      const extractedObligations = JSON.parse(jsonText.trim());
      if (!Array.isArray(extractedObligations)) {
        throw new Error('AI response is not a valid array');
      }

      this.logger.log(`[AIJobObligationService] AI bóc tách được ${extractedObligations.length} nghĩa vụ.`);

      const createdObligations: any[] = [];

      for (const item of extractedObligations) {
        const offsetDays = typeof item.dueDateOffsetDays === 'number' ? item.dueDateOffsetDays : 30;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + offsetDays);

        const newObligation = await this.prisma.obligation.create({
          data: {
            documentId,
            workspaceId: doc.workspaceId,
            title: item.title || 'Nghĩa vụ chưa đặt tên',
            description: item.description || '',
            status: 'pending', // mặc định là pending để chờ kiểm duyệt
            dueDate,
            amount: item.amount,
            percentage: item.percentage,
            triggerCondition: item.triggerCondition,
            obligationType: item.obligationType || 'other',
            effectivePeriod: item.effectivePeriod,
            responsibleVendor: item.responsibleVendor,
            notifiedStages: [],
          },
        });

        createdObligations.push(newObligation);
      }

      this.logger.log(`[AIJobObligationService] Đã tạo thành công ${createdObligations.length} nghĩa vụ nháp.`);
      return createdObligations;
    } catch (err: any) {
      this.logger.error(`[AIJobObligationService] Gặp lỗi khi bóc tách nghĩa vụ bằng AI: ${err.message}`);
      return [];
    }
  }
}
