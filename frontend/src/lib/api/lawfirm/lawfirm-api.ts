import { api } from '@/lib/api/client';
import type {
  ApproveExtractionInput,
  CreateFillRunInput,
  CreateLawfirmProfileInput,
  CreateLawfirmTemplateSetInput,
  ImportLocalWorkspaceInput,
  LawfirmExtractionDto,
  LawfirmFillRunDto,
  LawfirmAiUsageReportDto,
  LawfirmMappingJobDto,
  LawfirmMappingSummaryDto,
  LawfirmDocumentNavigationDto,
  LawfirmProfileDto,
  LawfirmTemplateSetDto,
  LawfirmTemplateUploadBatchDto,
  LawfirmTemplateUploadSessionDto,
  ReorderLawfirmTemplateDocumentsInput,
  UpdateLawfirmTemplateDocumentInput,
  UpdateLawfirmProfileInput,
  UpdateLawfirmTemplateSetInput,
} from './types';

const qs = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const lawfirmProfilesApi = {
  list: (workspaceId: string) => api.get<LawfirmProfileDto[]>(`/lawfirm/profiles${qs({ workspaceId })}`),
  getById: (id: string) => api.get<LawfirmProfileDto>(`/lawfirm/profiles/${id}`),
  create: (input: CreateLawfirmProfileInput) => api.post<LawfirmProfileDto>('/lawfirm/profiles', input),
  update: (id: string, input: UpdateLawfirmProfileInput) =>
    api.patch<LawfirmProfileDto>(`/lawfirm/profiles/${id}`, input),
  remove: (id: string) => api.delete<{ success: boolean }>(`/lawfirm/profiles/${id}`),
  uploadIdentity: (profileId: string, file: File, idempotencyKey?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (idempotencyKey) formData.append('idempotencyKey', idempotencyKey);
    return api.upload<LawfirmExtractionDto>(`/lawfirm/profiles/${profileId}/extractions`, formData);
  },
  importLocal: (input: ImportLocalWorkspaceInput) =>
    api.post<{
      imported: boolean;
      profileCount?: number;
      templateCount?: number;
    }>('/lawfirm/profiles/import-local', input),
};

export const lawfirmTemplateSetsApi = {
  list: (workspaceId: string) => api.get<LawfirmTemplateSetDto[]>(`/lawfirm/template-sets${qs({ workspaceId })}`),
  getById: (id: string) => api.get<LawfirmTemplateSetDto>(`/lawfirm/template-sets/${id}`),
  getDocumentNavigation: (documentId: string) =>
    api.get<LawfirmDocumentNavigationDto>(`/lawfirm/template-sets/documents/${documentId}/navigation`),
  updateFieldBinding: (templateSetId: string, fieldId: string, input: { entitySelector: string | null }) =>
    api.patch<{ field_id: string; entity_selector: string | null; updated_at: string }>(
      `/lawfirm/template-sets/${templateSetId}/field-bindings/${fieldId}`,
      input,
    ),
  create: (input: CreateLawfirmTemplateSetInput) => api.post<LawfirmTemplateSetDto>('/lawfirm/template-sets', input),
  update: (id: string, input: UpdateLawfirmTemplateSetInput) =>
    api.patch<LawfirmTemplateSetDto>(`/lawfirm/template-sets/${id}`, input),
  remove: (id: string) => api.delete<{ success: boolean }>(`/lawfirm/template-sets/${id}`),
  uploadDocument: (templateSetId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<LawfirmTemplateSetDto['documents'][number]>(
      `/lawfirm/template-sets/${templateSetId}/documents`,
      formData,
    );
  },
  updateDocument: (docId: string, body: UpdateLawfirmTemplateDocumentInput) =>
    api.patch<LawfirmTemplateSetDto['documents'][number]>(`/lawfirm/template-sets/documents/${docId}`, body),
  reorderDocuments: (templateSetId: string, body: ReorderLawfirmTemplateDocumentsInput) =>
    api.patch<LawfirmTemplateSetDto>(`/lawfirm/template-sets/${templateSetId}/document-order`, body),
  removeDocument: (docId: string) => api.delete(`/lawfirm/template-sets/documents/${docId}`),
  scanDocument: (docId: string) =>
    api.post<LawfirmMappingJobDto>(`/lawfirm/template-sets/template-documents/${docId}/scan`, {}),
  resolveMappings: (templateSetId: string) =>
    api.post<LawfirmMappingJobDto>(`/lawfirm/template-sets/${templateSetId}/resolve-mappings`, {}),
  getMappingSummary: (templateSetId: string) =>
    api.get<LawfirmMappingSummaryDto>(`/lawfirm/template-sets/${templateSetId}/mapping-summary`),
  getMappingJob: (jobId: string) => api.get<LawfirmMappingJobDto>(`/lawfirm/template-sets/mapping-jobs/${jobId}`),
};

export const lawfirmAiUsageApi = {
  report: (workspaceId: string, days = 30) =>
    api.get<LawfirmAiUsageReportDto>(`/lawfirm/ai-usage${qs({ workspaceId, days: String(days) })}`),
};

export const lawfirmTemplateUploadSessionsApi = {
  create: (templateSetId: string, idempotencyKey: string) =>
    api.post<LawfirmTemplateUploadSessionDto>('/lawfirm/template-upload-sessions', { templateSetId, idempotencyKey }),
  addDocuments: (sessionId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.upload<LawfirmTemplateUploadBatchDto>(
      `/lawfirm/template-upload-sessions/${sessionId}/documents`,
      formData,
    );
  },
  finalize: (sessionId: string) =>
    api.post<LawfirmTemplateUploadSessionDto>(`/lawfirm/template-upload-sessions/${sessionId}/finalize`, {}),
  getStatus: (sessionId: string) =>
    api.get<LawfirmTemplateUploadSessionDto>(`/lawfirm/template-upload-sessions/${sessionId}`),
};

export const lawfirmExtractionsApi = {
  list: (workspaceId: string, profileId?: string) =>
    api.get<LawfirmExtractionDto[]>(`/lawfirm/extractions${qs({ workspaceId, profileId })}`),
  approve: (id: string, input: ApproveExtractionInput) =>
    api.post<LawfirmProfileDto>(`/lawfirm/extractions/${id}/approve`, input),
  reject: (id: string, reason?: string) => api.post(`/lawfirm/extractions/${id}/reject`, { reason }),
};

export const lawfirmFillRunsApi = {
  list: (workspaceId: string) => api.get<LawfirmFillRunDto[]>(`/lawfirm/fill-runs${qs({ workspaceId })}`),
  create: (input: CreateFillRunInput) => api.post<LawfirmFillRunDto>('/lawfirm/fill-runs', input),
  getById: (id: string) => api.get<LawfirmFillRunDto>(`/lawfirm/fill-runs/${id}`),
  downloadUrl: (id: string) => `/api/proxy/lawfirm/fill-runs/${id}/download`,
};
