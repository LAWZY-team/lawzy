import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PlansController } from './plans.controller';
import { AdminPlansController } from './admin-plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), UsersModule],
  controllers: [PlansController, AdminPlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
