import { Module } from "@nestjs/common";
import { BatchController } from "./batch.controller";
import { BatchService } from "./batch.service";
import { DocService } from "../doc/doc.service";
import { PdfService } from "../pdf/pdf.service";
import { StorageService } from "../storage/storage.service";

@Module({
  controllers: [BatchController],
  providers: [BatchService, DocService, PdfService, StorageService],
})
export class BatchModule {}
