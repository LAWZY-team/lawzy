import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { WorkspaceAccessService } from '../../common/workspace-access.service';

@Injectable()
export class ConsistencyValidatorService {
  private readonly logger = new Logger(ConsistencyValidatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  /**
   * Chạy kiểm tra tính nhất quán chéo thông số giữa các tài liệu trong dự án
   */
  async validateConsistency(userId: string, projectId: string): Promise<any[]> {
    this.logger.log(`Bắt đầu chạy kiểm tra nhất quán cho dự án: ${projectId}`);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Xác minh quyền truy cập workspace
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    // Lấy tất cả tài liệu chưa bị xóa trong dự án
    const documents = await this.prisma.document.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
    });

    if (documents.length < 2) {
      this.logger.log(`Dự án ${projectId} có ít hơn 2 tài liệu. Bỏ qua so khớp nhất quán.`);
      
      // Chuyển toàn bộ alert hiện có của dự án này về resolved nếu có
      const docIds = documents.map((d) => d.id);
      if (docIds.length > 0) {
        await this.prisma.mismatchAlert.updateMany({
          where: {
            documentId: { in: docIds },
            status: 'unresolved',
          },
          data: { status: 'resolved' },
        });
      }
      return [];
    }

    // Chuẩn bị dữ liệu đầu vào cho AI đối chiếu
    const docsInput = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      metadata: doc.metadata || {},
    }));

    const prompt = `Bạn là chuyên gia phân tích chất lượng hồ sơ dự án pháp lý.
Nhiệm vụ của bạn là đối chiếu chéo thông tin metadata của các tài liệu trong cùng một dự án để phát hiện các sai lệch, xung đột hoặc không nhất quán về thông số kỹ thuật và pháp lý giữa chúng.

Dưới đây là danh sách các tài liệu và thông tin metadata của chúng:
${JSON.stringify(docsInput, null, 2)}

Hãy so sánh các trường sau giữa các tài liệu (bỏ qua/không so khớp trường đó nếu giá trị của nó là null hoặc rỗng ở một trong các tài liệu):
- 'capacity' (công suất dự án, ví dụ: '50MWp' vs '45MWp' là lệch)
- 'projectName' (tên dự án)
- 'developerName' (tên chủ đầu tư/bên giao/bên A)
- 'contractorName' (tên nhà thầu/bên nhận/bên B)
- 'location' (địa điểm thực hiện)

Hãy chỉ ra các tài liệu có thông số bị lệch/mâu thuẫn so với tài liệu gốc hoặc đa số tài liệu còn lại. Trả về kết quả dưới dạng mảng JSON chứa các đối tượng có cấu trúc sau:
{
  "documentId": "ID của tài liệu có thông số bị lệch",
  "fieldKey": "Tên trường bị lệch (chọn chính xác một trong: 'capacity', 'projectName', 'developerName', 'contractorName', 'location')",
  "sourceValue": "Giá trị chuẩn/đồng thuận (ví dụ: giá trị của tài liệu gốc hoặc đa số tài liệu)",
  "mismatchValue": "Giá trị bị lệch trong tài liệu này",
  "severity": "Mức độ nghiêm trọng: 'high' (nếu lệch công suất, địa điểm, tên doanh nghiệp chủ quản) hoặc 'medium'",
  "description": "Mô tả chi tiết sự lệch thông số (ví dụ: 'Công suất 45MWp lệch so với Hợp đồng chính là 50MWp')"
}

Chỉ trả về duy nhất mã JSON hợp lệ là một mảng, ví dụ:
[
  { "documentId": "doc-uuid-2", "fieldKey": "capacity", "sourceValue": "50MWp", "mismatchValue": "45MWp", "severity": "high", "description": "Công suất trong Biên bản nghiệm thu là 45MWp, bị lệch so với Hợp đồng EPC là 50MWp" }
]
Nếu tất cả thông số đều đồng nhất hoặc không có xung đột chéo, trả về mảng rỗng []`;

    try {
      this.logger.log('Gửi yêu cầu tới Gemini để đối chiếu chéo thông số...');
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

      const aiMismatches = JSON.parse(jsonText.trim());
      if (!Array.isArray(aiMismatches)) {
        throw new Error('AI response is not a valid array');
      }

      this.logger.log(`AI phát hiện ${aiMismatches.length} trường hợp lệch thông số.`);

      // Lấy toàn bộ alert hiện có của các tài liệu trong dự án
      const docIds = documents.map((d) => d.id);
      const existingAlerts = await this.prisma.mismatchAlert.findMany({
        where: { documentId: { in: docIds } },
      });

      const processedAlertIds: string[] = [];

      // 1. Cập nhật hoặc tạo mới các alert từ kết quả của AI
      for (const item of aiMismatches) {
        if (!item.documentId || !item.fieldKey) continue;

        const matchedDoc = documents.find((d) => d.id === item.documentId);
        if (!matchedDoc) continue;

        // Tìm alert cũ của document và fieldKey này
        const oldAlert = existingAlerts.find(
          (a) => a.documentId === item.documentId && a.fieldKey === item.fieldKey,
        );

        if (oldAlert) {
          // Cập nhật alert cũ thành unresolved kèm thông tin mới
          const updated = await this.prisma.mismatchAlert.update({
            where: { id: oldAlert.id },
            data: {
              sourceValue: item.sourceValue || '',
              mismatchValue: item.mismatchValue || '',
              severity: item.severity || 'medium',
              description: item.description || '',
              status: 'unresolved', // chuyển lại thành unresolved nếu đã resolved trước đó
            },
          });
          processedAlertIds.push(updated.id);
        } else {
          // Tạo alert mới
          const created = await this.prisma.mismatchAlert.create({
            data: {
              documentId: item.documentId,
              fieldKey: item.fieldKey,
              sourceValue: item.sourceValue || '',
              mismatchValue: item.mismatchValue || '',
              severity: item.severity || 'medium',
              description: item.description || '',
              status: 'unresolved',
            },
          });
          processedAlertIds.push(created.id);
        }
      }

      // 2. Tự động chuyển các alert không còn lệch sang trạng thái 'resolved'
      const activeAlertsToResolve = existingAlerts.filter(
        (a) => a.status === 'unresolved' && !processedAlertIds.includes(a.id),
      );

      for (const alertToResolve of activeAlertsToResolve) {
        await this.prisma.mismatchAlert.update({
          where: { id: alertToResolve.id },
          data: { status: 'resolved' },
        });
        this.logger.log(`Tự động giải phóng cảnh báo (resolved) cho alert: ${alertToResolve.id} (Trường: ${alertToResolve.fieldKey})`);
      }

      return this.getMismatchAlerts(userId, projectId);
    } catch (err: any) {
      this.logger.error(`Lỗi chạy kiểm tra nhất quán thông số: ${err.message}`);
      return this.getMismatchAlerts(userId, projectId);
    }
  }

  /**
   * Lấy danh sách mismatch alerts lọc theo phân quyền người dùng (RBAC)
   */
  async getMismatchAlerts(userId: string, projectId: string): Promise<any[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Xác minh quyền truy cập workspace
    await this.workspaceAccess.requireMembership(project.workspaceId, userId);

    const alerts = await this.prisma.mismatchAlert.findMany({
      where: {
        document: {
          projectId,
          deletedAt: null,
        },
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            visibility: true,
            createdBy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Lọc theo RBAC của User
    // Chỉ hiển thị cảnh báo thuộc về các tài liệu mà người dùng có quyền xem:
    // - visibility === 'workspace'
    // - hoặc visibility === 'private' nhưng createdBy === userId
    return alerts.filter((alert) => {
      const doc = alert.document;
      if (doc.visibility === 'private' && doc.createdBy !== userId) {
        return false;
      }
      return true;
    });
  }
}
