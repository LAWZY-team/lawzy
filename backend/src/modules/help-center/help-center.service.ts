import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Injectable()
export class HelpCenterService {
  constructor(private readonly emailService: EmailService) {}

  async submitFeedback(data: {
    userName: string;
    userEmail: string;
    type: string;
    title: string;
    description: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }) {
    // 1. Send email to Lawzy Team
    await this.emailService.sendFeedbackToTeam(data);

    // 2. Send receipt to User
    await this.emailService.sendFeedbackReceiptToUser(data.userEmail, data.type);

    return { success: true };
  }
}
