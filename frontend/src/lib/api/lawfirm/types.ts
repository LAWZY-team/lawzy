export type LawfirmInvestorType = 'individual' | 'organization';
export type LawfirmFieldGroup = 'individual' | 'organization' | 'representative' | 'other';
export type LawfirmTemplateStatus = 'draft' | 'ready';
export type LawfirmDocumentStatus = 'draft' | 'done';
export type LawfirmDocumentKind = 'docx' | 'doc' | 'pdf';
export type LawfirmVisibility = 'private' | 'public';
export type LawfirmExtractionStatus = 'pending' | 'approved' | 'rejected' | 'failed';

export interface LawfirmProfileFieldDto {
  id?: string;
  field_key: string;
  group: LawfirmFieldGroup;
  label: string;
  value: string;
  aliases: string;
  sort_order?: number;
}

export interface LawfirmProfileDto {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  investor_type: LawfirmInvestorType;
  revision: number;
  status: string;
  fields: LawfirmProfileFieldDto[];
  created_at: string;
  updated_at: string;
  read_only?: boolean;
}

export interface LawfirmTemplateFieldDto {
  id?: string;
  label: string;
  placeholder: string;
  mapped_key: string;
  source: 'auto' | 'highlight' | 'manual' | 'ai';
  count: number;
  sort_order?: number;
}

export interface LawfirmTemplateDocumentDto {
  id: string;
  file_name: string;
  file_type: LawfirmDocumentKind;
  status: LawfirmDocumentStatus;
  fields: LawfirmTemplateFieldDto[];
  preview_mode: 'highlight' | 'edit';
  preview_html?: string | null;
  plain_text?: string | null;
  file_id?: string | null;
  sort_order: number;
  read_only?: boolean;
}

export interface LawfirmTemplateSetDto {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  status: LawfirmTemplateStatus;
  visibility: LawfirmVisibility;
  revision: number;
  documents: LawfirmTemplateDocumentDto[];
  created_at: string;
  updated_at: string;
  read_only?: boolean;
  is_owner?: boolean;
}

export interface LawfirmExtractionSuggestion {
  fieldKey: string;
  label: string;
  value: string;
  group?: LawfirmFieldGroup;
  aliases?: string;
  sourceQuote?: string;
  confidence?: number;
}

export interface LawfirmTemplateScanSuggestion {
  placeholder: string;
  mappedKey: string;
  label: string;
  confidence: number;
  source: 'deterministic' | 'ai';
}

export interface LawfirmTemplateScanResultDto {
  document_id: string;
  deterministic: LawfirmTemplateScanSuggestion[];
  ai: LawfirmTemplateScanSuggestion[];
  state: 'ready_for_review' | 'processing' | 'failed';
  cached: boolean;
  note: string;
}

export type LawfirmTemplateUploadSessionStatus =
  | 'receiving'
  | 'queued'
  | 'processing'
  | 'review_ready'
  | 'partial_failed'
  | 'failed';

export interface LawfirmTemplateUploadSessionDto {
  session_id: string;
  template_set_id: string;
  status: LawfirmTemplateUploadSessionStatus;
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  finalized_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  progress?: {
    total: number;
    processed: number;
    failed: number;
    pending: number;
  };
  documents?: Array<{
    id: string;
    file_name: string;
    file_type: LawfirmDocumentKind;
    status: LawfirmDocumentStatus | 'queued' | 'failed';
    sort_order: number;
    updated_at: string;
  }>;
  jobs?: Array<{ kind: string; status: string; count: number }>;
}

export interface LawfirmTemplateUploadBatchDto {
  session_id: string;
  concurrency: number;
  documents: Array<{
    document_id: string | null;
    job_id: string;
    status: string;
    reused: boolean;
  }>;
}

export interface LawfirmExtractionDto {
  id: string;
  workspace_id: string;
  profile_id?: string | null;
  document_id?: string | null;
  kind: 'identity' | 'template_scan';
  status: LawfirmExtractionStatus;
  suggestions: LawfirmExtractionSuggestion[];
  provenance?: Record<string, unknown> | null;
  error_message?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LawfirmFillOutputDto {
  id: string;
  file_name: string;
  file_type: string;
  fill_count: number;
  state: 'success' | 'no_match' | 'unsupported' | 'error';
}

export interface LawfirmFillRunDto {
  id: string;
  workspace_id: string;
  profile_id: string;
  template_set_id: string;
  status: 'processing' | 'completed' | 'failed';
  match_summary?: Record<string, unknown> | null;
  outputs: LawfirmFillOutputDto[];
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLawfirmProfileInput {
  workspaceId: string;
  name: string;
  investorType?: LawfirmInvestorType;
  fields: Array<{
    fieldKey: string;
    group: LawfirmFieldGroup;
    label: string;
    value?: string;
    aliases?: string;
    sortOrder?: number;
  }>;
}

export interface UpdateLawfirmProfileInput {
  name?: string;
  investorType?: LawfirmInvestorType;
  revision: number;
  fields?: Array<{
    fieldKey: string;
    group: LawfirmFieldGroup;
    label: string;
    value?: string;
    aliases?: string;
    sortOrder?: number;
  }>;
}

export interface CreateLawfirmTemplateSetInput {
  workspaceId: string;
  name: string;
  visibility?: LawfirmVisibility;
}

export interface UpdateLawfirmTemplateSetInput {
  name?: string;
  status?: LawfirmTemplateStatus;
  visibility?: LawfirmVisibility;
  revision: number;
}

export interface ReorderLawfirmTemplateDocumentsInput {
  revision: number;
  documentIds: string[];
}

export interface UpdateLawfirmTemplateDocumentInput {
  fileName?: string;
  status?: LawfirmDocumentStatus;
  previewMode?: 'highlight' | 'edit';
  previewHtml?: string;
  plainText?: string;
  sortOrder?: number;
  fields?: Array<{
    id?: string;
    label: string;
    placeholder: string;
    mappedKey?: string;
    source?: 'auto' | 'highlight' | 'manual' | 'ai';
    count?: number;
    sortOrder?: number;
  }>;
}

export interface ApproveExtractionInput {
  approvedFields: LawfirmExtractionSuggestion[];
}

export interface CreateFillRunInput {
  workspaceId: string;
  profileId: string;
  templateSetId: string;
  idempotencyKey?: string;
}

export interface ImportLocalWorkspaceInput {
  workspaceId: string;
  hash: string;
  data: {
    profiles: Array<Record<string, unknown>>;
    templates: Array<Record<string, unknown>>;
  };
}
