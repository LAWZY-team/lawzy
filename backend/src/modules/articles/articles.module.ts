import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import {
  ArticlesController,
  AdminArticlesController,
} from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticlesStorageService } from './articles-storage.service';

@Module({
  imports: [PrismaModule, R2Module, AuthModule, UsersModule],
  controllers: [ArticlesController, AdminArticlesController],
  providers: [ArticlesService, ArticlesStorageService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
