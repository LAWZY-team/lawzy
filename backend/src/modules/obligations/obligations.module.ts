import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { ObligationsService } from './obligations.service';
import { ObligationsController } from './obligations.controller';
import { EscalationCronService } from './services/escalation-cron.service';
import { AIJobObligationService } from './services/ai-job-obligation.service';
import { EmailModule } from '../email/email.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CommonModule, PrismaModule, EmailModule, AiModule],
  controllers: [ObligationsController],
  providers: [ObligationsService, EscalationCronService, AIJobObligationService],
  exports: [ObligationsService, EscalationCronService, AIJobObligationService],
})
export class ObligationsModule {}
