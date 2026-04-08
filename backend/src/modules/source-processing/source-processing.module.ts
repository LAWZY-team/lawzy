import { Module } from '@nestjs/common';
import { PrismaModule } from '../../integrations/prisma/prisma.module';
import { R2Module } from '../../integrations/r2/r2.module';
import { SourceProcessingService } from './source-processing.service';
import { PdfExtractor } from './extractors/pdf.extractor';
import { DocxExtractor } from './extractors/docx.extractor';
import { TextExtractor } from './extractors/text.extractor';
import { UrlExtractor } from './extractors/url.extractor';
import { OcrExtractor } from './extractors/ocr.extractor';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [PrismaModule, R2Module],
  providers: [
    SourceProcessingService,
    PdfExtractor,
    DocxExtractor,
    TextExtractor,
    UrlExtractor,
    OcrExtractor,
    ChunkerService,
    EmbeddingService,
  ],
  exports: [SourceProcessingService, EmbeddingService, ChunkerService],
})
export class SourceProcessingModule {}
