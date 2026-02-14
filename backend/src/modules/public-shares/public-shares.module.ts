import { Module } from '@nestjs/common';
import { R2Module } from '../../integrations/r2/r2.module';
import { PublicSharesController } from './public-shares.controller';
import { PublicSharesService } from './public-shares.service';

@Module({
  imports: [R2Module],
  controllers: [PublicSharesController],
  providers: [PublicSharesService],
})
export class PublicSharesModule {}

