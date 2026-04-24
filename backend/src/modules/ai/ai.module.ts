import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { PlansModule } from '../plans/plans.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProviderService } from './ai-provider.service';

@Global()
@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [AiController],
  providers: [AiService, AiProviderService],
  exports: [AiService, AiProviderService],
})
export class AiModule {}
