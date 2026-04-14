import { Module } from '@nestjs/common';
import { LlmExperimentService } from './llm-experiment.service';
import { LlmExperimentController } from './llm-experiment.controller';
import { PrismaModule } from '../../integrations/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LlmExperimentController],
  providers: [LlmExperimentService],
})
export class LlmExperimentModule {}
