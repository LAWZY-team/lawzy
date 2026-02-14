import { Module } from '@nestjs/common';
import { R2Module } from '../../integrations/r2/r2.module';
import { ContractTemplatesController } from './contract-templates.controller';
import { ContractTemplatesService } from './contract-templates.service';

@Module({
  imports: [R2Module],
  controllers: [ContractTemplatesController],
  providers: [ContractTemplatesService],
})
export class ContractTemplatesModule {}

