import { createHash } from 'node:crypto';
import { normalizeLawfirmFieldAlias } from '../lawfirm-field-taxonomy';
import {
  compareLawfirmFieldsBySourceOrder,
  compareLawfirmSourceAnchors,
} from './lawfirm-source-order';

export interface TemplateIndexRegistryField {
  id: string;
  canonicalKey: string;
  currentProfileKey: string | null;
  aliases: Array<{ normalizedAlias: string }>;
}

export interface TemplateIndexDocument {
  id: string;
  sortOrder?: number;
  fields: Array<{
    id: string;
    label: string;
    placeholder: string;
    mappedKey: string;
    source: string;
    count: number;
    sortOrder: number;
    discovery?: unknown;
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
  sortOrder: number;
}

export interface IndexedDocumentSlot {
  documentId: string;
  legacyTemplateFieldId: string;
  normalizedSlot: string;
  occurrenceKey: string;
  sourceKind:
    | 'explicit_placeholder'
    | 'content_control'
    | 'bookmark'
    | 'merge_field'
    | 'blank_line'
    | 'dotted_blank'
    | 'empty_table_cell'
    | 'literal_value'
    | 'ocr_region'
    | 'ai_detected_span';
  rawText: string;
  labelText: string;
  currentValue: string | null;
  leftContext: string | null;
  rightContext: string | null;
  anchor: Record<string, unknown> | null;
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

const STRUCTURED_SOURCE_KINDS = new Set<IndexedDocumentSlot['sourceKind']>([
  'explicit_placeholder',
  'content_control',
  'bookmark',
  'merge_field',
  'blank_line',
  'dotted_blank',
  'empty_table_cell',
  'literal_value',
  'ocr_region',
]);

interface PersistedOccurrence {
  normalizedSlot: string;
  sourceKind: IndexedDocumentSlot['sourceKind'];
  rawText: string;
  labelText: string;
  currentValue: string | null;
  confidence: number;
  leftContext: string;
  rightContext: string;
  anchor: Record<string, unknown>;
}

const readDiscoveryOccurrences = (value: unknown): PersistedOccurrence[] => {
  if (!value || typeof value !== 'object') return [];
  const occurrences = (value as { occurrences?: unknown }).occurrences;
  if (!Array.isArray(occurrences)) return [];
  return occurrences.flatMap((occurrence): PersistedOccurrence[] => {
    if (!occurrence || typeof occurrence !== 'object') return [];
    const candidate = occurrence as Record<string, unknown>;
    if (
      typeof candidate.normalizedSlot !== 'string' ||
      typeof candidate.sourceKind !== 'string' ||
      !STRUCTURED_SOURCE_KINDS.has(
        candidate.sourceKind as IndexedDocumentSlot['sourceKind'],
      ) ||
      typeof candidate.rawText !== 'string' ||
      typeof candidate.labelText !== 'string' ||
      !candidate.anchor ||
      typeof candidate.anchor !== 'object'
    ) {
      return [];
    }
    return [
      {
        normalizedSlot: candidate.normalizedSlot,
        sourceKind: candidate.sourceKind as IndexedDocumentSlot['sourceKind'],
        rawText: candidate.rawText,
        labelText: candidate.labelText,
        currentValue:
          typeof candidate.currentValue === 'string'
            ? candidate.currentValue
            : null,
        confidence:
          typeof candidate.confidence === 'number' ? candidate.confidence : 0.5,
        leftContext:
          typeof candidate.leftContext === 'string'
            ? candidate.leftContext
            : '',
        rightContext:
          typeof candidate.rightContext === 'string'
            ? candidate.rightContext
            : '',
        anchor: candidate.anchor as Record<string, unknown>,
      },
    ];
  });
};

export function buildTemplateSetIndex(
  documents: TemplateIndexDocument[],
  registryFields: TemplateIndexRegistryField[],
): TemplateSetIndex {
  const orderedDocuments = documents
    .map((document, inputIndex) => ({
      ...document,
      inputIndex,
      fields: [...document.fields].sort(compareLawfirmFieldsBySourceOrder),
    }))
    .sort(
      (left, right) =>
        (left.sortOrder ?? left.inputIndex) -
          (right.sortOrder ?? right.inputIndex) ||
        left.inputIndex - right.inputIndex,
    );
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
      requiresReview: boolean;
      confidence: number;
      sortOrder: number;
    }
  >();
  const slots: IndexedDocumentSlot[] = [];

  for (const [documentIndex, document] of orderedDocuments.entries()) {
    for (const [fieldIndex, field] of document.fields.entries()) {
      const rawText = field.placeholder.trim() || field.label.trim();
      const discoveredOccurrences = readDiscoveryOccurrences(field.discovery);
      const normalizedSlot =
        discoveredOccurrences[0]?.normalizedSlot ||
        normalizeLawfirmFieldAlias(rawText);
      if (!normalizedSlot) continue;

      const aggregate = aggregates.get(normalizedSlot) ?? {
        displaySlot: field.label.trim() || rawText,
        definitionIds: new Set<string>(),
        hasUnresolvedMapping: false,
        requiresReview: false,
        confidence: 1,
        sortOrder:
          (document.sortOrder ?? documentIndex) * 1_000_000 + fieldIndex,
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
      for (const occurrence of discoveredOccurrences) {
        aggregate.confidence = Math.min(
          aggregate.confidence,
          occurrence.confidence,
        );
        aggregate.sortOrder = Math.min(
          aggregate.sortOrder,
          (document.sortOrder ?? documentIndex) * 1_000_000 + fieldIndex,
        );
        if (
          occurrence.sourceKind === 'literal_value' ||
          occurrence.confidence < 0.8
        ) {
          aggregate.requiresReview = true;
        }
      }
      aggregates.set(normalizedSlot, aggregate);

      if (discoveredOccurrences.length) {
        for (const [
          occurrenceIndex,
          occurrence,
        ] of discoveredOccurrences.entries()) {
          slots.push({
            documentId: document.id,
            legacyTemplateFieldId: field.id,
            normalizedSlot,
            occurrenceKey: fingerprint(
              `${document.id}:${field.id}:${occurrence.sourceKind}:${JSON.stringify(occurrence.anchor)}:${normalizedSlot}`,
            ),
            sourceKind: occurrence.sourceKind,
            rawText: occurrence.rawText,
            labelText: occurrence.labelText,
            currentValue: occurrence.currentValue,
            leftContext: occurrence.leftContext || null,
            rightContext: occurrence.rightContext || null,
            anchor: occurrence.anchor,
            occurrenceCount: 1,
            sortOrder: field.sortOrder * 1000 + occurrenceIndex,
          });
        }
      } else {
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
          currentValue: null,
          leftContext: null,
          rightContext: null,
          anchor: null,
          occurrenceCount: Math.max(1, field.count),
          sortOrder: field.sortOrder,
        });
      }
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
          : aggregate.requiresReview
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
        confidence:
          mappingStatus === 'mapped' || mappingStatus === 'needs_review'
            ? aggregate.confidence
            : null,
        contextFingerprint: fingerprint(normalizedSlot),
        sortOrder: aggregate.sortOrder,
      };
    },
  );

  const documentOrder = new Map(
    orderedDocuments.map((document, index) => [document.id, index]),
  );
  const slotOrderByDocument = new Map<string, number>();
  const orderedSlots = slots
    .sort(
      (left, right) =>
        (documentOrder.get(left.documentId) ?? Number.MAX_SAFE_INTEGER) -
          (documentOrder.get(right.documentId) ?? Number.MAX_SAFE_INTEGER) ||
        compareLawfirmSourceAnchors(left.anchor, right.anchor) ||
        left.occurrenceKey.localeCompare(right.occurrenceKey),
    )
    .map((slot) => {
      const sortOrder = slotOrderByDocument.get(slot.documentId) ?? 0;
      slotOrderByDocument.set(slot.documentId, sortOrder + 1);
      return { ...slot, sortOrder };
    });

  return {
    fields: fields.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.normalizedSlot.localeCompare(right.normalizedSlot),
    ),
    slots: orderedSlots,
  };
}
