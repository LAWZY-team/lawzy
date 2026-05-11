import { Injectable, NotFoundException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { supabase } from '../../config/supabase';
import type { BatchLanguage } from '../batch/dto/batch-request.dto';

interface FillTemplateInput {
  templateId: string;
  generalInfo: Record<string, unknown>;
  language: BatchLanguage;
}

@Injectable()
export class DocService {
  async fillTemplate(input: FillTemplateInput): Promise<Buffer> {
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('code', input.templateId)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      throw new NotFoundException(`Template ${input.templateId} not found`);
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(template.file_path);

    if (downloadError || !fileData) {
      throw new NotFoundException(`Template file not found: ${template.file_path}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const mappedData = this.mapData(input.generalInfo, template.field_mappings);
    doc.setData(mappedData);
    doc.render();

    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  }

  private mapData(
    generalInfo: Record<string, unknown>,
    fieldMappings: Record<string, string>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [placeholder, fieldPath] of Object.entries(fieldMappings)) {
      const cleanPlaceholder = placeholder.replace(/[{}]/g, '');
      const value = this.getNestedValue(generalInfo, fieldPath);
      result[cleanPlaceholder] = value ?? '';
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
