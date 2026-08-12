import { createHash } from 'node:crypto';
import { normalizeLawfirmFieldAlias } from '../lawfirm-field-taxonomy';

export interface MappingRegistryCandidate {
  id: string;
  canonicalKey: string;
  currentProfileKey: string | null;
  group: string;
  labelVi: string;
  labelEn: string;
  taxonomyVersion: number;
  aliases: Array<{ normalizedAlias: string }>;
}

export interface MappingSlotInput {
  id: string;
  label: string;
  normalizedSlot: string;
  contexts: string[];
  documentRefs: string[];
}

export interface ConstrainedMappingSlot extends MappingSlotInput {
  semanticFingerprint: string;
  candidateDefinitionIds: string[];
  candidateCanonicalKeys: string[];
}

const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const terms = (value: string): Set<string> =>
  new Set(
    normalizeLawfirmFieldAlias(value)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((item) => item.length > 1),
  );

const similarity = (left: string, right: string): number => {
  const normalizedLeft = normalizeLawfirmFieldAlias(left);
  const normalizedRight = normalizeLawfirmFieldAlias(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 10;
  let score =
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
      ? 2
      : 0;
  const leftTerms = terms(normalizedLeft);
  const rightTerms = terms(normalizedRight);
  const intersection = [...leftTerms].filter((item) => rightTerms.has(item));
  const union = new Set([...leftTerms, ...rightTerms]);
  score += union.size ? intersection.length / union.size : 0;
  return score;
};

export function constrainMappingCandidates(
  slot: MappingSlotInput,
  registry: MappingRegistryCandidate[],
  limit = 6,
): ConstrainedMappingSlot {
  const searchableSlot = [slot.label, slot.normalizedSlot, ...slot.contexts]
    .join(' ')
    .slice(0, 800);
  const ranked = registry
    .map((definition) => {
      const aliases = [
        definition.canonicalKey,
        definition.currentProfileKey ?? '',
        definition.labelVi,
        definition.labelEn,
        ...definition.aliases.map((alias) => alias.normalizedAlias),
      ];
      return {
        definition,
        score: Math.max(
          ...aliases.map((alias) => similarity(searchableSlot, alias)),
        ),
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.definition.canonicalKey.localeCompare(
          right.definition.canonicalKey,
        ),
    )
    .slice(0, Math.max(1, limit))
    .map((item) => item.definition);
  const semanticFingerprint = hash(
    JSON.stringify({
      slot: slot.normalizedSlot,
      contexts: slot.contexts.map(normalizeLawfirmFieldAlias).sort(),
      candidates: ranked.map((item) => item.canonicalKey).sort(),
    }),
  );
  return {
    ...slot,
    semanticFingerprint,
    candidateDefinitionIds: ranked.map((item) => item.id),
    candidateCanonicalKeys: ranked.map((item) => item.canonicalKey),
  };
}

export function chunkMappingSlots(
  slots: ConstrainedMappingSlot[],
  maxItems = 20,
  maxEstimatedTokens = 6_000,
): ConstrainedMappingSlot[][] {
  const chunks: ConstrainedMappingSlot[][] = [];
  let current: ConstrainedMappingSlot[] = [];
  let estimatedTokens = 0;
  for (const slot of slots) {
    const slotTokens = Math.ceil(JSON.stringify(slot).length / 4);
    if (
      current.length > 0 &&
      (current.length >= maxItems ||
        estimatedTokens + slotTokens > maxEstimatedTokens)
    ) {
      chunks.push(current);
      current = [];
      estimatedTokens = 0;
    }
    current.push(slot);
    estimatedTokens += slotTokens;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export const mappingCacheKey = (params: {
  semanticFingerprint: string;
  taxonomyVersion: number;
  promptVersion: string;
  modelName: string;
}) => hash(JSON.stringify(params));
