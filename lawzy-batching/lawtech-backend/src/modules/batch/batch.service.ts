import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  BatchRequestDto,
  BatchResponseDto,
} from "./dto/batch-request.dto";
import { DocService } from "../doc/doc.service";
import { PdfService } from "../pdf/pdf.service";
import { StorageService } from "../storage/storage.service";
import { supabase } from "../../config/supabase";

@Injectable()
export class BatchService {
  constructor(
    private readonly docService: DocService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService
  ) {}

  async batchFill(payload: BatchRequestDto): Promise<BatchResponseDto> {
    if (!payload.caseId) {
      throw new BadRequestException('caseId is required');
    }

    if (!payload.templateIds?.length) {
      throw new BadRequestException('At least one template is required');
    }

    await this.saveGeneralInfo(payload.caseId, payload.generalInfo);

    const filesToZip: Array<{ name: string; buffer: Buffer; extension: 'docx' | 'pdf' }> = [];
    const fileStatuses: BatchResponseDto['files'] = [];

    for (const templateId of payload.templateIds) {
      try {
        const docxBuffer = await this.docService.fillTemplate({
          templateId,
          generalInfo: payload.generalInfo,
          language: payload.language,
        });

        if (payload.format === 'docx' || payload.format === 'both') {
          filesToZip.push({
            name: `${templateId}_${payload.language}.docx`,
            buffer: docxBuffer,
            extension: 'docx',
          });
        }

        if (payload.format === 'pdf' || payload.format === 'both') {
          const pdfBuffer = await this.pdfService.convertDocxToPdf(docxBuffer);
          filesToZip.push({
            name: `${templateId}_${payload.language}.pdf`,
            buffer: pdfBuffer,
            extension: 'pdf',
          });
        }

        fileStatuses.push({
          templateCode: templateId,
          status: 'ok',
        });
      } catch (error) {
        fileStatuses.push({
          templateCode: templateId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const signedUrl = await this.storageService.uploadAndZip({
      caseId: payload.caseId,
      files: filesToZip,
    });

    await this.updateDocumentRecords(payload.caseId, payload.templateIds, signedUrl);

    return { signedUrl, files: fileStatuses };
  }

  private async saveGeneralInfo(caseId: string, data: Record<string, unknown>) {
    const { error } = await supabase
      .from('general_info')
      .upsert({
        case_id: caseId,
        data,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to save general info: ${error.message}`);
    }
  }

  private async updateDocumentRecords(
    caseId: string,
    templateIds: string[],
    outputPath: string,
  ) {
    for (const templateId of templateIds) {
      const { data: template } = await supabase
        .from('templates')
        .select('id')
        .eq('code', templateId)
        .single();

      if (template) {
        await supabase.from('documents').upsert({
          case_id: caseId,
          template_id: template.id,
          output_path: outputPath,
          status: 'completed',
          generated_at: new Date().toISOString(),
        });
      }
    }
  }
}
