import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
