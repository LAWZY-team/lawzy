import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../integrations/prisma/prisma.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class EscalationCronService {
  private readonly logger = new Logger(EscalationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Chạy định kỳ lúc 8:00 mỗi sáng để rà soát hạn nghĩa vụ
   */
  @Cron('0 8 * * *')
  async handleObligationCheck() {
    this.logger.log('[EscalationCronService] Bắt đầu quét rà soát nghĩa vụ hợp đồng...');

    // Lấy tất cả nghĩa vụ chưa hoàn thành
    const obligations = await this.prisma.obligation.findMany({
      where: {
        status: { not: 'completed' },
      },
      include: {
        document: {
          select: {
            title: true,
          },
        },
      },
    });

    this.logger.log(`[EscalationCronService] Phát hiện ${obligations.length} nghĩa vụ cần rà soát.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const ob of obligations) {
      if (!ob.picId) {
        // Không có PIC chịu trách nhiệm, bỏ qua cảnh báo hoặc gửi cho admin
        continue;
      }

      // Lấy thông tin email PIC
      const pic = await this.prisma.user.findUnique({
        where: { id: ob.picId },
        select: { email: true, name: true },
      });

      if (!pic || !pic.email) {
        continue;
      }

      const dueDate = new Date(ob.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Tính số ngày còn lại (hoặc quá hạn)
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Lấy danh sách các mốc đã được thông báo trước đó để tránh trùng lặp
      const notifiedStages = Array.isArray(ob.notifiedStages)
        ? (ob.notifiedStages as string[])
        : [];

      let targetStage: string | null = null;
      let newStatus: string | null = null;

      if (diffDays === 30) {
        targetStage = '30_days';
      } else if (diffDays === 15) {
        targetStage = '15_days';
      } else if (diffDays === 7) {
        targetStage = '7_days';
      } else if (diffDays === 0) {
        targetStage = 'due_date';
        newStatus = 'overdue';
      } else if (diffDays < 0) {
        if (diffDays <= -3) {
          targetStage = 'escalated';
          newStatus = 'escalated';
        } else {
          targetStage = 'overdue';
          newStatus = 'overdue';
        }
      }

      if (targetStage && !notifiedStages.includes(targetStage)) {
        try {
          this.logger.log(
            `[EscalationCronService] Gửi email cảnh báo mốc [${targetStage}] cho nghĩa vụ: ${ob.title} tới PIC: ${pic.email}`,
          );

          await this.emailService.sendObligationAlertEmail({
            toEmail: pic.email,
            title: ob.title,
            dueDate: ob.dueDate.toLocaleDateString('vi-VN'),
            stage: targetStage,
            responsibleParty: ob.responsibleVendor || undefined,
          });

          // Cập nhật mốc đã thông báo và trạng thái mới nếu có
          await this.prisma.obligation.update({
            where: { id: ob.id },
            data: {
              notifiedStages: [...notifiedStages, targetStage],
              ...(newStatus && { status: newStatus }),
            },
          });
        } catch (error: any) {
          this.logger.error(
            `[EscalationCronService] Lỗi gửi email cảnh báo cho nghĩa vụ ${ob.id}: ${error.message}`,
          );
        }
      } else if (newStatus && ob.status !== newStatus) {
        // Cập nhật trạng thái mới trong DB nếu chưa cập nhật (dù đã được gửi mail trước đó)
        await this.prisma.obligation.update({
          where: { id: ob.id },
          data: { status: newStatus },
        });
      }
    }

    this.logger.log('[EscalationCronService] Hoàn tất quét rà soát nghĩa vụ.');
  }

  /**
   * Cung cấp một trigger thủ công để phục vụ test nhanh
   */
  async triggerCheckManually() {
    this.logger.log('[EscalationCronService] Trigger thủ công quét rà soát nghĩa vụ...');
    await this.handleObligationCheck();
  }
}
