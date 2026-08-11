import { createHash } from 'node:crypto';
import { normalizeLawfirmFieldAlias } from '../lawfirm-field-taxonomy';

export interface TemplateIndexRegistryField {
  id: string;
  canonicalKey: string;
  currentProfileKey: string | null;
  aliases: Array<{ normalizedAlias: string }>;
}

export interface TemplateIndexDocument {
  id: string;
  fields: Array<{
    id: string;
    label: string;
    placeholder: string;
    mappedKey: string;
    source: string;
    count: number;
    sortOrder: number;
  }>;
}

export interface IndexedTemplateSetField {
  normalizedSlot: string;
  displaySlot: string;
  defaultFieldDefinitionId: string | null;
  mappingStatus: 'mapped' | 'unmapped' | 'needs_review' | 'conflict';
  mappingSource: 'deterministic';
  confidence: number | null;
  contextFingerprint: string;
}

export interface IndexedDocumentSlot {
  documentId: string;
  legacyTemplateFieldId: string;
  normalizedSlot: string;
  occurrenceKey: string;
  sourceKind: 'explicit_placeholder' | 'ai_detected_span';
  rawText: string;
  labelText: string;
  occurrenceCount: number;
  sortOrder: number;
}

export interface TemplateSetIndex {
  fields: IndexedTemplateSetField[];
  slots: IndexedDocumentSlot[];
}

const fingerprint = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const isExplicitPlaceholder = (value: string) =>
  /\[[^\]]+\]|\{\{[^}]+\}\}/u.test(value);

export function buildTemplateSetIndex(
  documents: TemplateIndexDocument[],
  registryFields: TemplateIndexRegistryField[],
): TemplateSetIndex {
  const registryByAlias = new Map<string, Set<string>>();
  for (const definition of registryFields) {
    const aliases = [
      definition.canonicalKey,
      definition.currentProfileKey ?? '',
      ...definition.aliases.map((alias) => alias.normalizedAlias),
    ];
    for (const alias of aliases) {
      const normalized = normalizeLawfirmFieldAlias(alias);
      if (!normalized) continue;
      const definitionIds =
        registryByAlias.get(normalized) ?? new Set<string>();
      definitionIds.add(definition.id);
      registryByAlias.set(normalized, definitionIds);
    }
  }

  const aggregates = new Map<
    string,
    {
      displaySlot: string;
      definitionIds: Set<string>;
      hasUnresolvedMapping: boolean;
    }
  >();
  const slots: IndexedDocumentSlot[] = [];

  for (const document of documents) {
    for (const field of document.fields) {
      const rawText = field.placeholder.trim() || field.label.trim();
      const normalizedSlot = normalizeLawfirmFieldAlias(rawText);
      if (!normalizedSlot) continue;

      const aggregate = aggregates.get(normalizedSlot) ?? {
        displaySlot: field.label.trim() || rawText,
        definitionIds: new Set<string>(),
        hasUnresolvedMapping: false,
      };
      const normalizedMappedKey = normalizeLawfirmFieldAlias(field.mappedKey);
      if (normalizedMappedKey) {
        const candidates = registryByAlias.get(normalizedMappedKey);
        if (candidates?.size === 1) {
          aggregate.definitionIds.add([...candidates][0]);
        } else {
          aggregate.hasUnresolvedMapping = true;
        }
      }
      aggregates.set(normalizedSlot, aggregate);

      slots.push({
        documentId: document.id,
        legacyTemplateFieldId: field.id,
        normalizedSlot,
        occurrenceKey: fingerprint(
          `${document.id}:${field.id}:${normalizedSlot}`,
        ),
        sourceKind: isExplicitPlaceholder(rawText)
          ? 'explicit_placeholder'
          : 'ai_detected_span',
        rawText,
        labelText: field.label,
        occurrenceCount: Math.max(1, field.count),
        sortOrder: field.sortOrder,
      });
    }
  }

  const fields = [...aggregates.entries()].map(
    ([normalizedSlot, aggregate]): IndexedTemplateSetField => {
      const definitionIds = [...aggregate.definitionIds];
      const hasConflict = definitionIds.length > 1;
      const hasSingleMapping = definitionIds.length === 1;
      const mappingStatus = hasConflict
        ? 'conflict'
        : aggregate.hasUnresolvedMapping
          ? 'needs_review'
          : hasSingleMapping
            ? 'mapped'
            : 'unmapped';
      return {
        normalizedSlot,
        displaySlot: aggregate.displaySlot,
        defaultFieldDefinitionId:
          mappingStatus === 'mapped' ? definitionIds[0] : null,
        mappingStatus,
        mappingSource: 'deterministic',
        confidence: mappingStatus === 'mapped' ? 1 : null,
        contextFingerprint: fingerprint(normalizedSlot),
      };
    },
  );

  return {
    fields: fields.sort((left, right) =>
      left.normalizedSlot.localeCompare(right.normalizedSlot),
    ),
    slots,
  };
}
