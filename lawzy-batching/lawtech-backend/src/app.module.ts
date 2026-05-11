import { Module } from "@nestjs/common";
import { BatchModule } from "./modules/batch/batch.module";
import { TemplateModule } from "./modules/template/template.module";
import { CaseModule } from "./modules/case/case.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [BatchModule, TemplateModule, CaseModule],
  controllers: [HealthController],
})
export class AppModule {}
