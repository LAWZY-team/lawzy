import { Module, forwardRef } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectMetadataExtractorService } from './project-metadata-extractor.service';
import { ProjectLinkerSuggestionService } from './project-linker-suggestion.service';
import { ClauseVersioningService } from './clause-versioning.service';
import { ConsistencyValidatorService } from './consistency-validator.service';
import { ProjectImportService } from './project-import.service';
import { SourceProcessingModule } from '../source-processing/source-processing.module';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    SourceProcessingModule,
    AiModule,
    forwardRef(() => DocumentsModule),
    FilesModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectMetadataExtractorService,
    ProjectLinkerSuggestionService,
    ClauseVersioningService,
    ConsistencyValidatorService,
    ProjectImportService,
  ],
  exports: [
    ProjectsService,
    ProjectMetadataExtractorService,
    ProjectLinkerSuggestionService,
    ClauseVersioningService,
    ConsistencyValidatorService,
    ProjectImportService,
  ],
})
export class ProjectsModule {}
