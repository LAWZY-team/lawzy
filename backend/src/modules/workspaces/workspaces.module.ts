import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { AdminWorkspacesController } from './admin-workspaces.controller';

@Module({
  imports: [
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
