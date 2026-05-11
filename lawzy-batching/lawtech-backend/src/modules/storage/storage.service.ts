import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';
import JSZip from 'jszip';

interface UploadFilesInput {
  caseId: string;
  files: Array<{
    name: string;
    buffer: Buffer;
    extension: 'docx' | 'pdf';
  }>;
}

@Injectable()
export class StorageService {
  async uploadAndZip(input: UploadFilesInput): Promise<string> {
    const zip = new JSZip();

    for (const file of input.files) {
      zip.file(file.name, file.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const fileName = `${input.caseId}/export_${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(fileName, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('outputs')
      .createSignedUrl(fileName, 3600);

    if (urlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`);
    }

    return signedUrlData.signedUrl;
  }
}
