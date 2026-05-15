import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';

@Injectable()
export class TemplateService {
  async uploadTemplate(
    file: any,
    metadata: { code: string; name: string; language: string; isRequired: boolean },
  ) {
    const filePath = `${metadata.language}/${metadata.code}_${file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from('templates')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const placeholders = this.extractPlaceholders(file.buffer);

    const { data, error } = await supabase.from('templates').insert({
      code: metadata.code,
      name: metadata.name,
      file_path: filePath,
      field_mappings: placeholders,
      language: metadata.language,
      is_required: metadata.isRequired,
      is_active: true,
    }).select().single();

    if (error) throw new Error(`Database insert failed: ${error.message}`);
    return data;
  }

  async listTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('code');

    if (error) throw new Error(`Failed to list templates: ${error.message}`);
    return data;
  }

  private extractPlaceholders(buffer: Buffer): Record<string, string> {
    const content = buffer.toString('utf-8');
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const matches = content.matchAll(regex);
    const mappings: Record<string, string> = {};

    for (const match of matches) {
      mappings[`{{${match[1]}}}`] = match[1];
    }
    return mappings;
  }
}
