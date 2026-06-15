import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { SingleDocumentsController } from './single-documents.controller';
import { ProjectsModule } from '../projects/projects.module';
import { ObligationsModule } from '../obligations/obligations.module';
import { FilesModule } from '../files/files.module';
import { SourceProcessingModule } from '../source-processing/source-processing.module';
import { R2Module } from '../../integrations/r2/r2.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ProjectsModule),
    ObligationsModule,
    FilesModule,
    SourceProcessingModule,
    R2Module,
  ],
  controllers: [DocumentsController, SingleDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
