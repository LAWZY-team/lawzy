import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AdminStorageController } from './admin-storage.controller';

@Module({
  imports: [PrismaModule, R2Module, AuthModule, UsersModule, PlansModule],
  controllers: [FilesController, AdminStorageController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
