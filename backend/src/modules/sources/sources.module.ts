import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { FilesModule } from '../files/files.module';
import { SourceProcessingModule } from '../source-processing/source-processing.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SourcesController } from './sources.controller';
import { SourceChunksController } from './source-chunks.controller';
import { AdminSourcesController } from './admin-sources.controller';
import { AdminSourceChunksController } from './admin-source-chunks.controller';
import { LegalCrawlerController } from './legal-crawler.controller';
import { SourcesService } from './sources.service';
import { LegalCrawlerService } from './legal-crawler.service';

@Module({
  imports: [
    PrismaModule,
    R2Module,
    FilesModule,
    SourceProcessingModule,
    forwardRef(() => AuthModule),
    UsersModule,
  ],
  controllers: [
    SourcesController,
    SourceChunksController,
    AdminSourcesController,
    AdminSourceChunksController,
    LegalCrawlerController,
  ],
  providers: [SourcesService, LegalCrawlerService],
  exports: [SourcesService],
})
export class SourcesModule {}
