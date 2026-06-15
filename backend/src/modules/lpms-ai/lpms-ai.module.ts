import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AiModule } from '../ai/ai.module';
import { SourceProcessingModule } from '../source-processing/source-processing.module';
import { LpmsAiController } from './lpms-ai.controller';
import { LpmsAiService } from './lpms-ai.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AiModule,
    SourceProcessingModule,
    FilesModule,
  ],
  controllers: [LpmsAiController],
  providers: [LpmsAiService],
  exports: [LpmsAiService],
})
export class LpmsAiModule {}
