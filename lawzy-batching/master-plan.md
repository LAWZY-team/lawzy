# Implementation Plan: Batching Information Feature

## Context

The Lawzy Legal system currently has a basic skeleton with mock data. The core requirement is to implement the **Batching Information** feature that allows law firm staff to:

1. Upload real .docx template files (or use pre-configured templates)
2. Fill a Master Form once with General Information
3. Auto-populate all 13 FDI legal document templates
4. Preview and export filled documents as .docx and .pdf

**Current State:**
- Frontend: Master Form UI exists with Zod validation, but uses mock data
- Backend: NestJS structure exists but all services return mock data
- Database: No Supabase tables created yet
- File Processing: No actual docxtemplater or LibreOffice integration
- Storage: No Supabase Storage integration

**Goal:** Make the system work end-to-end with real file uploads and document processing, prioritizing functionality over UI polish.

---

## Phase 1: Database & Storage Foundation

### 1.1 Create Supabase Database Schema

**File:** Create `supabase/migrations/001_initial_schema.sql`

```sql
-- Cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'error')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Info table (JSONB for flexibility)
CREATE TABLE general_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  language TEXT DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'both')),
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (generated outputs)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  output_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_general_info_case_id ON general_info(case_id);
CREATE INDEX idx_documents_case_id ON documents(case_id);

-- RLS Policies
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Intern can only see their own cases
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert own cases" ON cases
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE USING (created_by = auth.uid());

-- Leaders can see all (check user_metadata.role = 'leader')
CREATE POLICY "Leaders can view all cases" ON cases
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'leader'
  );

-- Similar policies for general_info and documents
CREATE POLICY "Users can view own general_info" ON general_info
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

CREATE POLICY "Users can insert own general_info" ON general_info
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

CREATE POLICY "Users can update own general_info" ON general_info
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

-- Templates are public read
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are viewable by all authenticated users" ON templates
  FOR SELECT USING (auth.role() = 'authenticated');
```

### 1.2 Create Storage Buckets

**Action:** Run in Supabase Dashboard or via SQL:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('templates', 'templates', true),
  ('outputs', 'outputs', false);

-- Storage policies for templates (public read)
CREATE POLICY "Templates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates');

CREATE POLICY "Only admins can upload templates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'templates' AND 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'leader'
  );

-- Storage policies for outputs (private, user-specific)
CREATE POLICY "Users can view own outputs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'outputs' AND 
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM cases WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert outputs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'outputs');
```

### 1.3 Seed Template Data

**File:** Create `supabase/seed.sql`

```sql
-- Insert 13 FDI templates with placeholder mappings
INSERT INTO templates (code, name, file_path, field_mappings, is_required) VALUES
('M01', 'Đơn đề nghị cấp Giấy chứng nhận đăng ký đầu tư', 'vi/M01_don_de_nghi.docx', 
  '{"{{company_name_vi}}": "companyNameVi", "{{company_name_en}}": "companyNameEn", "{{address}}": "address", "{{capital_amount}}": "capitalAmount", "{{registration_date}}": "registrationDate"}', 
  true),
('M02', 'Điều lệ công ty', 'vi/M02_dieu_le.docx',
  '{"{{company_name_vi}}": "companyNameVi", "{{address}}": "address", "{{capital_amount}}": "capitalAmount", "{{legal_rep_name}}": "legalRepName"}',
  true),
('M03', 'Danh sách thành viên góp vốn', 'vi/M03_danh_sach_thanh_vien.docx',
  '{"{{members}}": "members", "{{company_name_vi}}": "companyNameVi"}',
  true),
('M04', 'Giấy tờ chứng minh nhà đầu tư', 'vi/M04_giay_to_nha_dau_tu.docx',
  '{"{{members}}": "members"}',
  true),
('M05', 'Hợp đồng thuê trụ sở', 'vi/M05_hop_dong_thue.docx',
  '{"{{company_name_vi}}": "companyNameVi", "{{address}}": "address"}',
  true),
('M06', 'Báo cáo nghiên cứu khả thi', 'vi/M06_bao_cao_kha_thi.docx',
  '{"{{company_name_vi}}": "companyNameVi", "{{industries}}": "industries", "{{capital_amount}}": "capitalAmount"}',
  false);
-- Add remaining templates M07-M13 similarly
```

---

## Phase 2: Backend - Real Document Processing

### 2.1 Install Dependencies

**File:** `lawtech-backend/package.json`

Add dependencies:
```json
{
  "dependencies": {
    "docxtemplater": "^3.50.0",
    "pizzip": "^3.1.7",
    "libreoffice-convert": "^1.6.0",
    "jszip": "^3.10.1",
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

Run: `npm install` in `lawtech-backend/`

### 2.2 Setup Supabase Client

**File:** `lawtech-backend/src/config/supabase.ts` (create new)

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Use service key for backend
  {
    auth: { persistSession: false }
  }
);
```

**File:** `lawtech-backend/.env.example`

Add:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...
BACKEND_SECRET=your-secret-key
```

### 2.3 Implement Real DocService

**File:** `lawtech-backend/src/modules/doc/doc.service.ts`

Replace mock implementation with real docxtemplater:

```typescript
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
    // 1. Fetch template metadata from database
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('code', input.templateId)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      throw new NotFoundException(`Template ${input.templateId} not found`);
    }

    // 2. Download template file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(template.file_path);

    if (downloadError || !fileData) {
      throw new NotFoundException(`Template file not found: ${template.file_path}`);
    }

    // 3. Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Load template with PizZip
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // 5. Map generalInfo to template placeholders using field_mappings
    const mappedData = this.mapData(input.generalInfo, template.field_mappings);

    // 6. Render document
    doc.setData(mappedData);
    doc.render();

    // 7. Generate output buffer
    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return outputBuffer;
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
```

### 2.4 Implement Real PdfService

**File:** `lawtech-backend/src/modules/pdf/pdf.service.ts`

Replace mock with LibreOffice conversion:

```typescript
import { Injectable } from '@nestjs/common';
import * as libre from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

@Injectable()
export class PdfService {
  async convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
    try {
      const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
      return pdfBuffer as Buffer;
    } catch (error) {
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }
}
```

**Note:** LibreOffice must be installed in the Docker container (already in Dockerfile).

### 2.5 Implement Real StorageService

**File:** `lawtech-backend/src/modules/storage/storage.service.ts`

Replace mock with real Supabase Storage:

```typescript
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';
import * as JSZip from 'jszip';

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
    // 1. Create ZIP file
    const zip = new JSZip();
    
    for (const file of input.files) {
      zip.file(file.name, file.buffer);
    }

    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // 2. Upload to Supabase Storage
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

    // 3. Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('outputs')
      .createSignedUrl(fileName, 3600);

    if (urlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${urlError?.message}`);
    }

    return signedUrlData.signedUrl;
  }
}
```

### 2.6 Update BatchService with Real Processing

**File:** `lawtech-backend/src/modules/batch/batch.service.ts`

Update to use real services and handle both docx and pdf:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import type { BatchRequestDto, BatchResponseDto } from './dto/batch-request.dto';
import { DocService } from '../doc/doc.service';
import { PdfService } from '../pdf/pdf.service';
import { StorageService } from '../storage/storage.service';
import { supabase } from '../../config/supabase';

@Injectable()
export class BatchService {
  constructor(
    private readonly docService: DocService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {}

  async batchFill(payload: BatchRequestDto): Promise<BatchResponseDto> {
    if (!payload.caseId) {
      throw new BadRequestException('caseId is required');
    }

    if (!payload.templateIds?.length) {
      throw new BadRequestException('At least one template is required');
    }

    // 1. Save/update general_info in database
    await this.saveGeneralInfo(payload.caseId, payload.generalInfo);

    // 2. Process each template
    const filesToZip: Array<{ name: string; buffer: Buffer; extension: 'docx' | 'pdf' }> = [];
    const fileStatuses: BatchResponseDto['files'] = [];

    for (const templateId of payload.templateIds) {
      try {
        // Generate DOCX
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

        // Generate PDF if needed
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

    // 3. Upload to storage and get signed URL
    const signedUrl = await this.storageService.uploadAndZip({
      caseId: payload.caseId,
      files: filesToZip,
    });

    // 4. Update documents table
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
```

---

## Phase 3: Template Upload & Management

### 3.1 Create Template Upload Endpoint

**File:** `lawtech-backend/src/modules/template/template.controller.ts` (create new)

```typescript
import { Controller, Post, UseInterceptors, UploadedFile, Body, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplateService } from './template.service';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: { code: string; name: string; language: string; isRequired: string },
  ) {
    return this.templateService.uploadTemplate(file, {
      ...metadata,
      isRequired: metadata.isRequired === 'true',
    });
  }

  @Get()
  async listTemplates() {
    return this.templateService.listTemplates();
  }
}
```


**File:** `lawtech-backend/src/modules/template/template.service.ts` (create new)

```typescript
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';

@Injectable()
export class TemplateService {
  async uploadTemplate(
    file: Express.Multer.File,
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
```


**File:** `lawtech-backend/src/modules/template/template.module.ts` (create new)

```typescript
import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
```

**File:** `lawtech-backend/src/app.module.ts`

Add TemplateModule to imports array.

---

## Phase 4: Frontend Integration

### 4.1 Update Supabase Client

**File:** `lawtech/lib/supabase.ts`

Ensure client is properly configured:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```


### 4.2 Create Case Management API

**File:** `lawtech-backend/src/modules/case/case.controller.ts` (create new)

```typescript
import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { CaseService } from './case.service';

@Controller('cases')
export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  @Post()
  async createCase(@Body() data: { name: string; createdBy: string }) {
    return this.caseService.createCase(data);
  }

  @Get(':id')
  async getCase(@Param('id') id: string) {
    return this.caseService.getCase(id);
  }

  @Get()
  async listCases() {
    return this.caseService.listCases();
  }
}
```


**File:** `lawtech-backend/src/modules/case/case.service.ts` (create new)

```typescript
import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';

@Injectable()
export class CaseService {
  async createCase(data: { name: string; createdBy: string }) {
    const { data: caseData, error } = await supabase
      .from('cases')
      .insert({
        name: data.name,
        created_by: data.createdBy,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create case: ${error.message}`);
    return caseData;
  }

  async getCase(id: string) {
    const { data, error } = await supabase
      .from('cases')
      .select('*, general_info(*)')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to get case: ${error.message}`);
    return data;
  }

  async listCases() {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list cases: ${error.message}`);
    return data;
  }
}
```


**File:** `lawtech-backend/src/modules/case/case.module.ts` (create new)

```typescript
import { Module } from '@nestjs/common';
import { CaseController } from './case.controller';
import { CaseService } from './case.service';

@Module({
  controllers: [CaseController],
  providers: [CaseService],
  exports: [CaseService],
})
export class CaseModule {}
```

Update `app.module.ts` to include CaseModule.

### 4.3 Update Frontend API Client

**File:** `lawtech/lib/api.ts`

Add case management functions:

```typescript
export async function createCase(name: string, userId: string) {
  const res = await fetch(`${API_URL}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdBy: userId }),
  });
  if (!res.ok) throw new Error(`Failed to create case: ${res.status}`);
  return res.json();
}

export async function getCase(id: string) {
  const res = await fetch(`${API_URL}/cases/${id}`);
  if (!res.ok) throw new Error(`Failed to get case: ${res.status}`);
  return res.json();
}

export async function listTemplates() {
  const res = await fetch(`${API_URL}/templates`);
  if (!res.ok) throw new Error(`Failed to list templates: ${res.status}`);
  return res.json();
}
```


### 4.4 Update CaseWorkspace Component

**File:** `lawtech/components/cases/CaseWorkspace.tsx`

Update to fetch real templates and call real batch API:

```typescript
// Replace mock data with real API calls
const { data: templates } = useQuery({
  queryKey: ['templates'],
  queryFn: listTemplates,
});

// Update batch fill handler
const handleBatchFill = async (data: GeneralInfo) => {
  const result = await batchFill({
    caseId: caseId,
    generalInfo: data,
    templateIds: selectedTemplates,
    language: 'vi',
    format: 'both',
  });
  
  // Download the zip file
  window.location.href = result.signedUrl;
};
```

---

## Phase 5: Verification & Testing

### 5.1 Backend Verification

**Steps:**

1. Start backend with Docker:
   ```bash
   cd lawtech-backend
   docker build -t lawtech-backend .
   docker run -p 8000:8000 --env-file .env lawtech-backend
   ```

2. Test health endpoint:
   ```bash
   curl http://localhost:8000/health
   ```

3. Test template upload:
   ```bash
   curl -X POST http://localhost:8000/templates/upload \
     -F "file=@sample.docx" \
     -F "code=M01" \
     -F "name=Test Template" \
     -F "language=vi" \
     -F "isRequired=true"
   ```


4. Test batch fill endpoint:
   ```bash
   curl -X POST http://localhost:8000/batch \
     -H "Content-Type: application/json" \
     -d '{
       "caseId": "test-case-123",
       "generalInfo": {
         "companyNameVi": "Công ty Test",
         "companyNameEn": "Test Company",
         "address": "123 Test St",
         "capitalAmount": 1000000000,
         "capitalCurrency": "VND"
       },
       "templateIds": ["M01"],
       "language": "vi",
       "format": "docx"
     }'
   ```

### 5.2 Database Verification

1. Run migrations in Supabase Dashboard SQL Editor
2. Verify tables created: `cases`, `general_info`, `templates`, `documents`
3. Verify storage buckets: `templates`, `outputs`
4. Test RLS policies by creating test users

### 5.3 Frontend Verification

1. Start frontend:
   ```bash
   cd lawtech
   npm run dev
   ```

2. Test flow:
   - Login with test user
   - Create new case
   - Fill Master Form
   - Select templates
   - Click "Batch Fill"
   - Verify download works


### 5.4 End-to-End Test

**Test Scenario:** Complete batch fill workflow

1. Upload a real .docx template with placeholders like `{{company_name_vi}}`
2. Create a new case via API
3. Fill Master Form with complete data
4. Select all templates
5. Click "Batch Fill"
6. Verify:
   - Backend processes without errors
   - ZIP file downloads successfully
   - ZIP contains .docx and .pdf files
   - Documents have correct data filled in
   - No placeholders remain unfilled

---

## Critical Files to Modify/Create

### Backend (lawtech-backend/)
- `src/config/supabase.ts` (create)
- `src/modules/doc/doc.service.ts` (replace mock)
- `src/modules/pdf/pdf.service.ts` (replace mock)
- `src/modules/storage/storage.service.ts` (replace mock)
- `src/modules/batch/batch.service.ts` (update)
- `src/modules/template/` (create module)
- `src/modules/case/` (create module)
- `src/app.module.ts` (add modules)
- `package.json` (add dependencies)
- `.env` (configure Supabase)


### Frontend (lawtech/)
- `lib/supabase.ts` (verify setup)
- `lib/api.ts` (add case/template functions)
- `components/cases/CaseWorkspace.tsx` (use real APIs)
- `.env.local` (configure Supabase + backend URL)

### Database (Supabase)
- `supabase/migrations/001_initial_schema.sql` (create)
- `supabase/seed.sql` (create)
- Storage buckets: `templates`, `outputs`

---

## Implementation Order

**Priority 1 - Foundation (Days 1-2):**
1. Create database schema and run migrations
2. Setup storage buckets
3. Configure Supabase in backend
4. Install backend dependencies

**Priority 2 - Core Processing (Days 3-4):**
5. Implement DocService with docxtemplater
6. Implement PdfService with LibreOffice
7. Implement StorageService with Supabase
8. Update BatchService to use real services


**Priority 3 - Template & Case Management (Days 5-6):**
9. Create TemplateModule with upload endpoint
10. Create CaseModule with CRUD endpoints
11. Seed initial template data
12. Test template upload and listing

**Priority 4 - Frontend Integration (Days 7-8):**
13. Update frontend API client
14. Connect CaseWorkspace to real APIs
15. Test end-to-end flow
16. Fix any bugs found during testing

---

## Summary

This plan transforms the mock-based system into a fully functional document batching system by:

1. **Database Foundation**: Creating Supabase tables, RLS policies, and storage buckets
2. **Real Document Processing**: Implementing docxtemplater for .docx filling and LibreOffice for PDF conversion
3. **File Management**: Uploading templates, storing outputs, generating signed URLs
4. **API Integration**: Connecting frontend to real backend endpoints
5. **End-to-End Testing**: Verifying the complete workflow works with real files

**Key Technical Decisions:**
- Use docxtemplater for placeholder replacement (handles Word formatting)
- Use LibreOffice headless for PDF conversion (preserves layout)
- Store templates in public bucket, outputs in private bucket
- Use JSONB for flexible general_info storage
- Implement RLS for multi-tenant security

**Next Steps After Implementation:**
- Add field mapping UI for admins
- Implement preview functionality
- Add audit logging
- Optimize PDF conversion performance
- Add batch processing queue for large jobs

