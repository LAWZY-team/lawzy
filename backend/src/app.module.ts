import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './integrations/prisma/prisma.module';
import { R2Module } from './integrations/r2/r2.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ContractTemplatesModule } from './modules/contract-templates/contract-templates.module';
import { PublicSharesModule } from './modules/public-shares/public-shares.module';
import { FilesModule } from './modules/files/files.module';
import { SourcesModule } from './modules/sources/sources.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { HelpCenterModule } from './modules/help-center/help-center.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { PlansModule } from './modules/plans/plans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    R2Module,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    DocumentsModule,
    ContractTemplatesModule,
    PublicSharesModule,
    FilesModule,
    SourcesModule,
    DashboardModule,
    TemplatesModule,
    HelpCenterModule,
    ArticlesModule,
    PlansModule,
    PaymentsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
