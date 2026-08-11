import type {
  LawfirmAiExtraction,
  LawfirmClientProfile,
  LawfirmFillOutput,
  LawfirmFillRun,
  LawfirmProfileField,
  LawfirmTemplateDocument,
  LawfirmTemplateField,
  LawfirmTemplateSet,
} from '@prisma/client';
import { fixUploadFilename } from '../../../common/fix-upload-filename';

const toIso = (value: Date | string | null | undefined): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

export const serializeProfileField = (field: LawfirmProfileField) => ({
  id: field.id,
  profile_id: field.profileId,
  field_key: field.fieldKey,
  group: field.group,
  label: field.label,
  value: field.value,
  aliases: field.aliases,
  sort_order: field.sortOrder,
});

export const serializeProfile = (
  profile: LawfirmClientProfile & { fields?: LawfirmProfileField[] },
) => ({
  id: profile.id,
  workspace_id: profile.workspaceId,
  created_by: profile.createdBy,
  name: profile.name,
  description: profile.description ?? null,
  investor_type: profile.investorType,
  revision: profile.revision,
  status: profile.status,
  created_at: toIso(profile.createdAt),
  updated_at: toIso(profile.updatedAt),
  fields: profile.fields?.map(serializeProfileField) ?? [],
});

export const serializeTemplateField = (field: LawfirmTemplateField) => ({
  id: field.id,
  document_id: field.documentId,
  label: field.label,
  placeholder: field.placeholder,
  mapped_key: field.mappedKey,
  source: field.source,
  count: field.count,
  sort_order: field.sortOrder,
  discovery: field.discovery ?? null,
});

export const serializeTemplateDocument = (
  doc: LawfirmTemplateDocument & { fields?: LawfirmTemplateField[] },
  options?: { readOnly?: boolean },
) => ({
  id: doc.id,
  template_set_id: doc.templateSetId,
  file_name: fixUploadFilename(doc.fileName),
  file_type: doc.fileType,
  status: doc.status,
  storage_key: doc.storageKey,
  plain_text: doc.plainText,
  preview_mode: doc.previewMode,
  preview_html: doc.previewHtml,
  file_id: doc.fileId,
  sort_order: doc.sortOrder,
  created_at: toIso(doc.createdAt),
  updated_at: toIso(doc.updatedAt),
  read_only: options?.readOnly ?? false,
  fields: doc.fields?.map(serializeTemplateField) ?? [],
});

export const serializeTemplateSet = (
  set: LawfirmTemplateSet & {
    documents?: (LawfirmTemplateDocument & {
      fields?: LawfirmTemplateField[];
    })[];
  },
  options?: { isOwner?: boolean; readOnly?: boolean },
) => ({
  id: set.id,
  workspace_id: set.workspaceId,
  created_by: set.createdBy,
  name: set.name,
  description: set.description ?? null,
  status: set.status,
  visibility: set.visibility,
  revision: set.revision,
  created_at: toIso(set.createdAt),
  updated_at: toIso(set.updatedAt),
  is_owner: options?.isOwner ?? false,
  read_only: options?.readOnly ?? false,
  documents:
    set.documents?.map((doc) =>
      serializeTemplateDocument(doc, { readOnly: options?.readOnly }),
    ) ?? [],
});

export const serializeExtraction = (extraction: LawfirmAiExtraction) => ({
  id: extraction.id,
  workspace_id: extraction.workspaceId,
  profile_id: extraction.profileId,
  document_id: extraction.documentId,
  created_by: extraction.createdBy,
  kind: extraction.kind,
  status: extraction.status,
  suggestions: extraction.suggestions,
  provenance: extraction.provenance,
  storage_key: extraction.storageKey,
  model_name: extraction.modelName,
  error_message: extraction.errorMessage,
  expires_at: extraction.expiresAt ? toIso(extraction.expiresAt) : null,
  approved_at: extraction.approvedAt ? toIso(extraction.approvedAt) : null,
  created_at: toIso(extraction.createdAt),
  updated_at: toIso(extraction.updatedAt),
});

export const serializeFillOutput = (output: LawfirmFillOutput) => ({
  id: output.id,
  fill_run_id: output.fillRunId,
  file_name: fixUploadFilename(output.fileName),
  storage_key: output.storageKey,
  file_type: output.fileType,
  fill_count: output.fillCount,
  state: output.state,
});

export const serializeFillRun = (
  run: LawfirmFillRun & { outputs?: LawfirmFillOutput[] },
) => ({
  id: run.id,
  workspace_id: run.workspaceId,
  profile_id: run.profileId,
  template_set_id: run.templateSetId,
  created_by: run.createdBy,
  status: run.status,
  match_summary: run.matchSummary,
  zip_storage_key: run.zipStorageKey,
  error_message: run.errorMessage,
  created_at: toIso(run.createdAt),
  updated_at: toIso(run.updatedAt),
  outputs: run.outputs?.map(serializeFillOutput) ?? [],
});
