import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { EmailModule } from '../email/email.module';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { WebhookPaymentsController } from './webhook-payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, PlansModule, EmailModule],
  controllers: [
    PaymentsController,
    AdminPaymentsController,
    WebhookPaymentsController,
  ],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
