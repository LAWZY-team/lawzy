import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { EmailService } from './email.service';
import { AdminEmailTemplatesController } from './admin-email-templates.controller';
import { AdminEmailTemplatesService } from './admin-email-templates.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [AdminEmailTemplatesController],
  providers: [EmailService, AdminEmailTemplatesService],
  exports: [EmailService],
})
export class EmailModule {}
