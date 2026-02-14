import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getR2Env } from './config/env';
import { R2Module } from './integrations/r2/r2.module';
import { ContractTemplatesModule } from './modules/contract-templates/contract-templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    R2Module,
    ContractTemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    // Fail fast if R2 env vars are not configured (names preserved from plans/R2storage.md)
    getR2Env();
  }
}
