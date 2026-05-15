import { Module } from '@nestjs/common';
import { R2Module } from '../../integrations/r2/r2.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';
import { ContractTemplatesController } from './contract-templates.controller';
import { ContractTemplatesService } from './contract-templates.service';
import { AiSanitizerService } from './ai-sanitizer.service';

@Module({
  imports: [R2Module, AuthModule, UsersModule, FilesModule],
  controllers: [ContractTemplatesController],
  providers: [ContractTemplatesService, AiSanitizerService],
})
export class ContractTemplatesModule {}
