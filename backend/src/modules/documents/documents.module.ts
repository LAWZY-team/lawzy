import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ProjectsModule } from '../projects/projects.module';
import { ObligationsModule } from '../obligations/obligations.module';

@Module({
  imports: [PrismaModule, ProjectsModule, ObligationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
