import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { FilesModule } from '../files/files.module';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [PrismaModule, R2Module, FilesModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
