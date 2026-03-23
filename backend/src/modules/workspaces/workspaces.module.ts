import { Module, forwardRef } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { AdminWorkspacesController } from './admin-workspaces.controller';

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    UsersModule,
    PlansModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WorkspacesController, AdminWorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
