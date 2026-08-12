import type {
  LawfirmProfileDto,
  LawfirmTemplateDocumentDto,
  LawfirmTemplateSetDto,
} from '@/lib/api/lawfirm/types';
import { fixMojibake } from '@/lib/fix-mojibake';
import type {
  ClientProfile,
  FieldGroup,
  InvestorType,
  ProfileField,
  TemplateDocument,
  TemplateField,
  TemplateSet,
} from '@/components/lawfirm-demo/lawfirm-demo-types';

export const mapProfileDto = (profile: LawfirmProfileDto): ClientProfile => ({
  id: profile.id,
  name: profile.name,
  description: profile.description ?? "",
  createdAt: profile.created_at,
  investorType: profile.investor_type as InvestorType,
  fields: profile.fields.map(
    (field): ProfileField => ({
      id: field.field_key,
      group: field.group as FieldGroup,
      label: field.label,
      value: field.value,
      aliases: field.aliases,
    }),
  ),
});

export const mapProfileToUpdate = (profile: ClientProfile, revision: number) => ({
  revision,
  name: profile.name,
  description: profile.description ?? "",
  investorType: profile.investorType,
  fields: profile.fields.map((field, index) => ({
    fieldKey: field.id,
    group: field.group,
    label: field.label,
    value: field.value,
    aliases: field.aliases,
    sortOrder: index,
  })),
});

export const mapTemplateDocumentDto = (doc: LawfirmTemplateDocumentDto): TemplateDocument => ({
  id: doc.id,
  fileName: fixMojibake(doc.file_name),
  fileType: doc.file_type,
  status: doc.status,
  fields: doc.fields.map(
    (field): TemplateField => ({
      id: field.id ?? `${doc.id}-${field.placeholder}`,
      label: field.label,
      placeholder: field.placeholder,
      mappedKey: field.mapped_key,
      source: field.source,
      count: field.count,
      discovery: field.discovery ?? undefined,
    }),
  ),
  previewMode: doc.preview_mode,
  previewHtml: doc.preview_html ?? undefined,
  plainText: doc.plain_text ?? '',
  storageKey: doc.file_id ?? doc.id,
  fileId: doc.file_id ?? undefined,
});

export const mapTemplateSetDto = (template: LawfirmTemplateSetDto): TemplateSet => ({
  id: template.id,
  name: template.name,
  description: template.description ?? "",
  createdAt: template.created_at,
  status: template.status,
  documents: template.documents.map(mapTemplateDocumentDto),
});

export const mapTemplateSetToUpdate = (
  template: TemplateSet,
  revision: number,
  extra?: { visibility?: 'private' | 'public' },
) => ({
  revision,
  name: template.name,
  description: template.description ?? "",
  status: template.status,
  visibility: extra?.visibility,
});

export const mapDocumentToUpdate = (document: TemplateDocument) => ({
  fileName: document.fileName,
  status: document.status,
  previewMode: document.previewMode,
  previewHtml: document.previewHtml,
  plainText: document.plainText,
  fields: document.fields.map((field, index) => ({
    id: field.id,
    label: field.label,
    placeholder: field.placeholder,
    mappedKey: field.mappedKey,
    source: field.source,
    count: field.count,
    sortOrder: index,
  })),
});

export const mapExtractionSuggestions = (
  suggestions: unknown,
): Array<{
  fieldKey: string;
  label: string;
  value: string;
  group?: string;
  aliases?: string;
}> => {
  if (!Array.isArray(suggestions)) return [];
  return suggestions.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      fieldKey: String(row.fieldKey ?? row.field_key ?? ''),
      label: String(row.label ?? row.fieldKey ?? row.field_key ?? ''),
      value: String(row.value ?? ''),
      group: row.group ? String(row.group) : undefined,
      aliases: row.aliases ? String(row.aliases) : undefined,
    };
  });
};
