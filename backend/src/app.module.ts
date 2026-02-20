import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './integrations/prisma/prisma.module';
import { R2Module } from './integrations/r2/r2.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContractTemplatesModule } from './modules/contract-templates/contract-templates.module';
import { PublicSharesModule } from './modules/public-shares/public-shares.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    R2Module,
    AuthModule,
    UsersModule,
    ContractTemplatesModule,
    PublicSharesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
