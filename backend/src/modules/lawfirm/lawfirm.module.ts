import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { FilesModule } from '../files/files.module';
import { AiModule } from '../ai/ai.module';
import { SourceProcessingModule } from '../source-processing/source-processing.module';
import { OcrExtractor } from '../source-processing/extractors/ocr.extractor';
import { LawfirmAuditService } from './lawfirm-audit.service';
import { LawfirmScanService } from './lawfirm-scan.service';
import { LawfirmProfilesService } from './lawfirm-profiles.service';
import { LawfirmProfilesController } from './lawfirm-profiles.controller';
import { LawfirmTemplateSetsService } from './lawfirm-template-sets.service';
import { LawfirmTemplateSetsController } from './lawfirm-template-sets.controller';
import { LawfirmExtractionsService } from './lawfirm-extractions.service';
import { LawfirmExtractionsController } from './lawfirm-extractions.controller';
import { LawfirmFillRunsService } from './lawfirm-fill-runs.service';
import { LawfirmFillRunsController } from './lawfirm-fill-runs.controller';
import { LawfirmR2Helper } from './utils/lawfirm-r2.helper';

@Module({
  imports: [
    PrismaModule,
    R2Module,
    FilesModule,
    AiModule,
    SourceProcessingModule,
  ],
  controllers: [
    LawfirmProfilesController,
    LawfirmTemplateSetsController,
    LawfirmExtractionsController,
    LawfirmFillRunsController,
  ],
  providers: [
    LawfirmAuditService,
    LawfirmScanService,
    LawfirmProfilesService,
    LawfirmTemplateSetsService,
    LawfirmExtractionsService,
    LawfirmFillRunsService,
    LawfirmR2Helper,
    OcrExtractor,
  ],
  exports: [
    LawfirmAuditService,
    LawfirmScanService,
    LawfirmProfilesService,
    LawfirmTemplateSetsService,
    LawfirmExtractionsService,
    LawfirmFillRunsService,
  ],
})
export class LawfirmModule {}
