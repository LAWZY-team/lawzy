import {
  findLawfirmFieldDefinitionByKey,
  normalizePersistedLawfirmFieldKey,
  normalizeTemplateMappedKey,
  resolveCurrentProfileFieldKey,
} from '../lawfirm-field-taxonomy';

export interface LegacyAuditProfileField {
  id: string;
  profileId: string;
  fieldKey: string;
  value: string;
}

export interface LegacyAuditTemplateField {
  id: string;
  documentId: string;
  placeholder: string;
  mappedKey: string;
}

export interface LawfirmLegacyAuditReport {
  summary: {
    profileFields: number;
    templateFields: number;
    legacyKeys: number;
    unknownKeys: number;
    profileValueConflicts: number;
    templateMappingConflicts: number;
  };
  legacyKeys: Array<{
    recordType: 'profile' | 'template';
    recordId: string;
    from: string;
    to: string;
  }>;
  unknownKeys: Array<{
    recordType: 'profile' | 'template';
    recordId: string;
    key: string;
  }>;
  profileValueConflicts: Array<{
    profileId: string;
    canonicalKey: string;
    fieldIds: string[];
    values: string[];
  }>;
  templateMappingConflicts: Array<{
    fieldId: string;
    documentId: string;
    placeholder: string;
    mappedKey: string;
    expectedKey: string;
  }>;
}

export const auditLawfirmLegacyFields = (input: {
  profileFields: LegacyAuditProfileField[];
  templateFields: LegacyAuditTemplateField[];
}): LawfirmLegacyAuditReport => {
  const legacyKeys: LawfirmLegacyAuditReport['legacyKeys'] = [];
  const unknownKeys: LawfirmLegacyAuditReport['unknownKeys'] = [];
  const profileValueConflicts: LawfirmLegacyAuditReport['profileValueConflicts'] =
    [];
  const templateMappingConflicts: LawfirmLegacyAuditReport['templateMappingConflicts'] =
    [];
  const profileSemanticValues = new Map<
    string,
    Array<{ id: string; value: string }>
  >();

  for (const field of input.profileFields) {
    const definition = findLawfirmFieldDefinitionByKey(field.fieldKey);
    const persistedKey = normalizeTemplateMappedKey(field.fieldKey);
    const normalized = normalizePersistedLawfirmFieldKey(field.fieldKey);
    if (persistedKey === undefined || !persistedKey) {
      unknownKeys.push({
        recordType: 'profile',
        recordId: field.id,
        key: field.fieldKey,
      });
      continue;
    }
    if (definition && normalized !== field.fieldKey.trim()) {
      legacyKeys.push({
        recordType: 'profile',
        recordId: field.id,
        from: field.fieldKey,
        to: normalized,
      });
    }
    const semanticKey = `${field.profileId}:${normalized}`;
    const fields = profileSemanticValues.get(semanticKey) ?? [];
    fields.push({ id: field.id, value: field.value.trim() });
    profileSemanticValues.set(semanticKey, fields);
  }

  for (const [semanticKey, fields] of profileSemanticValues) {
    const values = [
      ...new Set(fields.map((field) => field.value).filter(Boolean)),
    ];
    if (values.length <= 1) continue;
    const separator = semanticKey.indexOf(':');
    profileValueConflicts.push({
      profileId: semanticKey.slice(0, separator),
      canonicalKey: semanticKey.slice(separator + 1),
      fieldIds: fields.map((field) => field.id),
      values,
    });
  }

  for (const field of input.templateFields) {
    const normalized = normalizeTemplateMappedKey(field.mappedKey);
    if (normalized === undefined) {
      unknownKeys.push({
        recordType: 'template',
        recordId: field.id,
        key: field.mappedKey,
      });
      continue;
    }
    if (normalized && normalized !== field.mappedKey.trim()) {
      legacyKeys.push({
        recordType: 'template',
        recordId: field.id,
        from: field.mappedKey,
        to: normalized,
      });
    }
    const expectedKey = resolveCurrentProfileFieldKey(field.placeholder);
    if (expectedKey && normalized && expectedKey !== normalized) {
      templateMappingConflicts.push({
        fieldId: field.id,
        documentId: field.documentId,
        placeholder: field.placeholder,
        mappedKey: normalized,
        expectedKey,
      });
    }
  }

  return {
    summary: {
      profileFields: input.profileFields.length,
      templateFields: input.templateFields.length,
      legacyKeys: legacyKeys.length,
      unknownKeys: unknownKeys.length,
      profileValueConflicts: profileValueConflicts.length,
      templateMappingConflicts: templateMappingConflicts.length,
    },
    legacyKeys,
    unknownKeys,
    profileValueConflicts,
    templateMappingConflicts,
  };
};
