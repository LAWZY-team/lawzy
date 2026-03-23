import { Module, forwardRef } from '@nestjs/common';
import { HelpCenterController } from './help-center.controller';
import { HelpCenterService } from './help-center.service';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EmailModule,
    PrismaModule,
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [HelpCenterController],
  providers: [HelpCenterService],
})
export class HelpCenterModule {}
