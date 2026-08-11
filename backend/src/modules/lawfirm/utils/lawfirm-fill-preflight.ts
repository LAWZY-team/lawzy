import {
  findLawfirmFieldDefinitionByKey,
  normalizePersistedLawfirmFieldKey,
} from '../lawfirm-field-taxonomy';
import { guessCanonicalMapping } from './lawfirm-placeholder-detector';

export type LawfirmPreflightIssueCode =
  | 'PROFILE_CANONICAL_VALUE_CONFLICT'
  | 'PLACEHOLDER_MAPPING_CONFLICT'
  | 'UNKNOWN_AUTOMATIC_MAPPING';

export interface LawfirmPreflightIssue {
  code: LawfirmPreflightIssueCode;
  message: string;
  fieldKey?: string;
  documentId?: string;
  templateFieldId?: string;
  placeholder?: string;
  values?: string[];
}

interface PreflightProfileField {
  fieldKey: string;
  value: string;
}

interface PreflightTemplateField {
  id: string;
  placeholder: string;
  mappedKey: string;
  source: string;
}

interface PreflightTemplateDocument {
  id: string;
  fields: PreflightTemplateField[];
}

export const validateLawfirmFillPreflight = (input: {
  profileFields: PreflightProfileField[];
  documents: PreflightTemplateDocument[];
}): LawfirmPreflightIssue[] => {
  const issues: LawfirmPreflightIssue[] = [];
  const valuesByFieldKey = new Map<string, Set<string>>();

  for (const field of input.profileFields) {
    const value = field.value.trim();
    if (!value) continue;
    const fieldKey = normalizePersistedLawfirmFieldKey(field.fieldKey);
    const values = valuesByFieldKey.get(fieldKey) ?? new Set<string>();
    values.add(value);
    valuesByFieldKey.set(fieldKey, values);
  }

  for (const [fieldKey, values] of valuesByFieldKey) {
    if (values.size < 2) continue;
    issues.push({
      code: 'PROFILE_CANONICAL_VALUE_CONFLICT',
      message: `Profile contains conflicting values for ${fieldKey}`,
      fieldKey,
      values: [...values],
    });
  }

  for (const document of input.documents) {
    for (const field of document.fields) {
      if (!field.mappedKey.trim()) continue;
      const mappedKey = normalizePersistedLawfirmFieldKey(field.mappedKey);
      const expectedKey = guessCanonicalMapping(field.placeholder);

      if (expectedKey && mappedKey !== expectedKey) {
        issues.push({
          code: 'PLACEHOLDER_MAPPING_CONFLICT',
          message: `Placeholder ${field.placeholder} is mapped to ${mappedKey} instead of ${expectedKey}`,
          documentId: document.id,
          templateFieldId: field.id,
          placeholder: field.placeholder,
          fieldKey: mappedKey,
        });
        continue;
      }

      const isAutomatic = field.source === 'auto' || field.source === 'ai';
      const isKnownKey = Boolean(findLawfirmFieldDefinitionByKey(mappedKey));
      if (isAutomatic && !isKnownKey) {
        issues.push({
          code: 'UNKNOWN_AUTOMATIC_MAPPING',
          message: `Automatic mapping ${mappedKey} is not in the canonical taxonomy`,
          documentId: document.id,
          templateFieldId: field.id,
          placeholder: field.placeholder,
          fieldKey: mappedKey,
        });
      }
    }
  }

  return issues;
};
