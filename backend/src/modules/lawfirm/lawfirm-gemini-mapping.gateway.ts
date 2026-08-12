import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';
import { LawfirmAiUsageService } from './lawfirm-ai-usage.service';
import {
  chunkMappingSlots,
  constrainMappingCandidates,
  mappingCacheKey,
  type ConstrainedMappingSlot,
  type MappingRegistryCandidate,
} from './utils/lawfirm-mapping-candidates';

const PROMPT_VERSION = 'lawfirm-map-v1';
const DEFAULT_ENTITY_SELECTOR = 'root';
const CACHE_CONFIDENCE = 0.9;
const AUTO_MAP_CONFIDENCE = 0.85;
const MAX_CALLS_PER_JOB = 3;
const MAX_WORKSPACE_CALLS_PER_MINUTE = 10;
const CIRCUIT_FAILURE_THRESHOLD = 3;

interface MappingDecision {
  id: string;
  decision: 'mapped' | 'needs_review' | 'unmapped';
  canonicalKey: string | null;
  entitySelector: string | null;
  confidence: number;
  reasonCode: string;
  source: 'cache' | 'gemini';
}

@Injectable()
export class LawfirmGeminiMappingGateway {
  private readonly logger = new Logger(LawfirmGeminiMappingGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly usageService: LawfirmAiUsageService,
  ) {}

  async resolve(params: {
    workspaceId: string;
    actorId: string;
    templateSetId: string;
    mappingJobId: string;
    templateSetRevision: number;
  }) {
    const [setFields, registry] = await Promise.all([
      this.prisma.lawfirmTemplateSetField.findMany({
        where: {
          templateSetId: params.templateSetId,
          mappingStatus: { in: ['unmapped', 'needs_review', 'conflict'] },
        },
        include: {
          documentSlots: {
            select: {
              documentId: true,
              labelText: true,
              leftContext: true,
              rightContext: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { normalizedSlot: 'asc' },
      }),
      this.prisma.lawfirmFieldDefinition.findMany({
        where: {
          status: 'active',
          OR: [{ scope: 'system' }, { workspaceId: params.workspaceId }],
        },
        select: {
          id: true,
          canonicalKey: true,
          currentProfileKey: true,
          group: true,
          labelVi: true,
          labelEn: true,
          taxonomyVersion: true,
          aliases: { select: { normalizedAlias: true } },
        },
      }),
    ]);
    const typedRegistry = registry as MappingRegistryCandidate[];
    const taxonomyVersion = Math.max(
      1,
      ...typedRegistry.map((item) => item.taxonomyVersion),
    );
    const modelName =
      process.env.LAWFIRM_GEMINI_MAPPING_MODEL || 'gemini-2.5-flash';
    const constrained = setFields.map((field) =>
      constrainMappingCandidates(
        {
          id: field.id,
          label: field.displaySlot,
          normalizedSlot: field.normalizedSlot,
          contexts: [
            ...new Set(
              field.documentSlots.flatMap((slot) => [
                slot.labelText ?? '',
                slot.leftContext ?? '',
                slot.rightContext ?? '',
              ]),
            ),
          ]
            .filter(Boolean)
            .slice(0, 4)
            .map((item) => item.slice(0, 200)),
          documentRefs: [
            ...new Set(field.documentSlots.map((slot) => slot.documentId)),
          ],
        },
        typedRegistry,
      ),
    );
    const definitionByCanonical = new Map(
      typedRegistry.map((item) => [item.canonicalKey, item]),
    );
    const decisions: MappingDecision[] = [];
    const unresolved: ConstrainedMappingSlot[] = [];
    for (const slot of constrained) {
      const cacheKey = mappingCacheKey({
        semanticFingerprint: slot.semanticFingerprint,
        taxonomyVersion,
        promptVersion: PROMPT_VERSION,
        modelName,
      });
      const cached = await this.prisma.lawfirmMappingCache.findUnique({
        where: {
          workspaceId_cacheKey: { workspaceId: params.workspaceId, cacheKey },
        },
        include: { fieldDefinition: true },
      });
      if (
        cached &&
        cached.confidence >= CACHE_CONFIDENCE &&
        slot.candidateDefinitionIds.includes(cached.fieldDefinitionId)
      ) {
        await this.prisma.lawfirmMappingCache.update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
        });
        decisions.push({
          id: slot.id,
          decision: 'mapped',
          canonicalKey: cached.fieldDefinition.canonicalKey,
          entitySelector: cached.entitySelector,
          confidence: cached.confidence,
          reasonCode: 'APPLICATION_CACHE',
          source: 'cache',
        });
      } else {
        unresolved.push(slot);
      }
    }

    const chunks = chunkMappingSlots(unresolved).slice(0, MAX_CALLS_PER_JOB);
    for (const [chunkIndex, chunk] of chunks.entries()) {
      decisions.push(
        ...(await this.resolveChunk({
          ...params,
          taxonomyVersion,
          modelName,
          registry: typedRegistry,
          definitionByCanonical,
          chunk,
          chunkIndex,
        })),
      );
    }
    const processedIds = new Set(decisions.map((item) => item.id));
    for (const slot of constrained) {
      if (processedIds.has(slot.id)) continue;
      decisions.push({
        id: slot.id,
        decision: 'needs_review',
        canonicalKey: null,
        entitySelector: null,
        confidence: 0,
        reasonCode: 'CALL_BUDGET_EXCEEDED',
        source: 'gemini',
      });
    }

    await this.persistDecisions(
      params.workspaceId,
      taxonomyVersion,
      modelName,
      constrained,
      typedRegistry,
      decisions,
    );
    const slotById = new Map(constrained.map((item) => [item.id, item]));
    const definitionByKey = new Map(
      typedRegistry.map((item) => [item.canonicalKey, item]),
    );
    return {
      total_unique_slots: constrained.length,
      cache_hits: decisions.filter((item) => item.source === 'cache').length,
      gemini_calls: chunks.length,
      mapped: decisions.filter((item) => item.decision === 'mapped').length,
      needs_review: decisions.filter((item) => item.decision !== 'mapped')
        .length,
      decisions: decisions.map((decision) => {
        const slot = slotById.get(decision.id)!;
        const definition = decision.canonicalKey
          ? definitionByKey.get(decision.canonicalKey)
          : undefined;
        return {
          slot_id: decision.id,
          label: slot.label,
          normalized_slot: slot.normalizedSlot,
          decision: decision.decision,
          canonical_key: decision.canonicalKey,
          mapped_key: definition?.currentProfileKey ?? '',
          entity_selector: decision.entitySelector,
          confidence: decision.confidence,
          reason_code: decision.reasonCode,
          source: decision.source,
          document_refs: slot.documentRefs,
        };
      }),
    };
  }

  private async resolveChunk(params: {
    workspaceId: string;
    actorId: string;
    templateSetId: string;
    mappingJobId: string;
    templateSetRevision: number;
    taxonomyVersion: number;
    modelName: string;
    registry: MappingRegistryCandidate[];
    definitionByCanonical: Map<string, MappingRegistryCandidate>;
    chunk: ConstrainedMappingSlot[];
    chunkIndex: number;
  }): Promise<MappingDecision[]> {
    const operationKey = `mapping:${params.mappingJobId}:${params.chunkIndex}`;
    const startedAt = Date.now();
    let apiAttempts = 0;
    const guard = await this.checkCallGuard(params.workspaceId);
    if (!guard.allowed) {
      await this.usageService.record({
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        templateSetId: params.templateSetId,
        mappingJobId: params.mappingJobId,
        taskType: 'template_mapping',
        taskLabel: `Ánh xạ trường bộ hồ sơ · batch ${params.chunkIndex + 1}`,
        operationKey,
        modelName: params.modelName,
        status: 'cached',
        inputItems: params.chunk.length,
        errorCode: guard.reason,
      });
      return params.chunk.map((slot) => ({
        id: slot.id,
        decision: 'needs_review',
        canonicalKey: null,
        entitySelector: null,
        confidence: 0,
        reasonCode: guard.reason,
        source: 'gemini',
      }));
    }
    const input = params.chunk.map((slot) => ({
      id: slot.id,
      label: slot.label,
      contexts: slot.contexts,
      candidateCanonicalKeys: slot.candidateCanonicalKeys,
      documentRefs: slot.documentRefs,
    }));
    const prompt = `Resolve legal-template fields to the supplied canonical candidates.
Rules:
- Choose only a candidateCanonicalKey supplied for that id.
- Use decision "mapped" only when evidence is clear; otherwise "needs_review" or "unmapped".
- Never invent a key or value.
- entitySelector must be "root" for this phase.
- Return one result per input id and no duplicate ids.

Input:
${JSON.stringify({ taxonomyVersion: params.taxonomyVersion, slots: input })}`;
    try {
      const response = await this.aiProvider.generateContentWithRetry({
        model: params.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['mappings'],
            properties: {
              mappings: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'id',
                    'decision',
                    'canonicalKey',
                    'entitySelector',
                    'confidence',
                    'reasonCode',
                  ],
                  properties: {
                    id: { type: 'string' },
                    decision: {
                      type: 'string',
                      enum: ['mapped', 'needs_review', 'unmapped'],
                    },
                    canonicalKey: { type: ['string', 'null'] },
                    entitySelector: { type: ['string', 'null'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reasonCode: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        onAttempt: (event) => {
          if (event.outcome === 'started') apiAttempts = event.attempt;
        },
      });
      const parsed = JSON.parse(response.text ?? '{}') as {
        mappings?: Array<Record<string, unknown>>;
      };
      const decisions = this.validateMappings(
        params.chunk,
        params.definitionByCanonical,
        parsed.mappings ?? [],
      );
      const usage = response.usageMetadata;
      await this.usageService.record({
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        templateSetId: params.templateSetId,
        mappingJobId: params.mappingJobId,
        taskType: 'template_mapping',
        taskLabel: `Ánh xạ trường bộ hồ sơ · batch ${params.chunkIndex + 1}`,
        operationKey,
        modelName: params.modelName,
        status: 'completed',
        promptTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        cachedTokens: usage?.cachedContentTokenCount,
        thinkingTokens: usage?.thoughtsTokenCount,
        toolTokens: usage?.toolUsePromptTokenCount,
        totalTokens: usage?.totalTokenCount,
        retryCount: Math.max(0, apiAttempts - 1),
        latencyMs: Date.now() - startedAt,
        inputItems: params.chunk.length,
        resultItems: decisions.length,
        metadata: {
          promptVersion: PROMPT_VERSION,
          taxonomyVersion: params.taxonomyVersion,
          templateSetRevision: params.templateSetRevision,
          chunkIndex: params.chunkIndex,
        },
      });
      return decisions;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.usageService.record({
        workspaceId: params.workspaceId,
        actorId: params.actorId,
        templateSetId: params.templateSetId,
        mappingJobId: params.mappingJobId,
        taskType: 'template_mapping',
        taskLabel: `Ánh xạ trường bộ hồ sơ · batch ${params.chunkIndex + 1}`,
        operationKey,
        modelName: params.modelName,
        status: 'failed',
        retryCount: Math.max(0, apiAttempts - 1),
        latencyMs: Date.now() - startedAt,
        inputItems: params.chunk.length,
        errorCode: 'GEMINI_MAPPING_FAILED',
        metadata: { error: message.slice(0, 500) },
      });
      this.logger.warn(`Mapping batch failed: ${message}`);
      return params.chunk.map((slot) => ({
        id: slot.id,
        decision: 'needs_review',
        canonicalKey: null,
        entitySelector: null,
        confidence: 0,
        reasonCode: 'GEMINI_UNAVAILABLE',
        source: 'gemini',
      }));
    }
  }

  private async checkCallGuard(
    workspaceId: string,
  ): Promise<{ allowed: true } | { allowed: false; reason: string }> {
    const [recentCalls, recentFailures] = await Promise.all([
      this.prisma.lawfirmAiUsageEvent.count({
        where: {
          workspaceId,
          taskType: 'template_mapping',
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
      }),
      this.prisma.lawfirmAiUsageEvent.count({
        where: {
          workspaceId,
          taskType: 'template_mapping',
          status: 'failed',
          createdAt: { gte: new Date(Date.now() - 2 * 60_000) },
        },
      }),
    ]);
    if (recentFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      return { allowed: false, reason: 'CIRCUIT_OPEN' };
    }
    if (recentCalls >= MAX_WORKSPACE_CALLS_PER_MINUTE) {
      return { allowed: false, reason: 'WORKSPACE_RATE_LIMIT' };
    }
    return { allowed: true };
  }

  private validateMappings(
    slots: ConstrainedMappingSlot[],
    definitions: Map<string, MappingRegistryCandidate>,
    rawMappings: Array<Record<string, unknown>>,
  ): MappingDecision[] {
    const slotById = new Map(slots.map((slot) => [slot.id, slot]));
    const seen = new Set<string>();
    const valid = new Map<string, MappingDecision>();
    for (const raw of rawMappings) {
      const id = typeof raw.id === 'string' ? raw.id : '';
      const slot = slotById.get(id);
      if (!slot || seen.has(id)) continue;
      seen.add(id);
      const decision =
        raw.decision === 'mapped' ||
        raw.decision === 'needs_review' ||
        raw.decision === 'unmapped'
          ? raw.decision
          : 'needs_review';
      const canonicalKey =
        typeof raw.canonicalKey === 'string' ? raw.canonicalKey : null;
      const allowed =
        canonicalKey !== null &&
        slot.candidateCanonicalKeys.includes(canonicalKey) &&
        definitions.has(canonicalKey);
      const confidence =
        typeof raw.confidence === 'number'
          ? Math.max(0, Math.min(1, raw.confidence))
          : 0;
      const canMap =
        decision === 'mapped' &&
        allowed &&
        raw.entitySelector === DEFAULT_ENTITY_SELECTOR &&
        confidence >= AUTO_MAP_CONFIDENCE;
      valid.set(id, {
        id,
        decision: canMap
          ? 'mapped'
          : decision === 'unmapped'
            ? 'unmapped'
            : 'needs_review',
        canonicalKey: canMap ? canonicalKey : null,
        entitySelector: canMap ? DEFAULT_ENTITY_SELECTOR : null,
        confidence,
        reasonCode:
          typeof raw.reasonCode === 'string'
            ? raw.reasonCode.slice(0, 80)
            : 'INVALID_OR_LOW_CONFIDENCE',
        source: 'gemini',
      });
    }
    return slots.map(
      (slot) =>
        valid.get(slot.id) ?? {
          id: slot.id,
          decision: 'needs_review',
          canonicalKey: null,
          entitySelector: null,
          confidence: 0,
          reasonCode: 'MISSING_RESULT',
          source: 'gemini',
        },
    );
  }

  private async persistDecisions(
    workspaceId: string,
    taxonomyVersion: number,
    modelName: string,
    slots: ConstrainedMappingSlot[],
    registry: MappingRegistryCandidate[],
    decisions: MappingDecision[],
  ): Promise<void> {
    const slotById = new Map(slots.map((item) => [item.id, item]));
    const definitionByCanonical = new Map(
      registry.map((item) => [item.canonicalKey, item]),
    );
    await this.prisma.$transaction(async (tx) => {
      for (const decision of decisions) {
        const definition = decision.canonicalKey
          ? definitionByCanonical.get(decision.canonicalKey)
          : undefined;
        const mapped = decision.decision === 'mapped' && definition;
        await tx.lawfirmTemplateSetField.update({
          where: { id: decision.id },
          data: mapped
            ? {
                defaultFieldDefinitionId: definition.id,
                defaultEntitySelector:
                  decision.entitySelector ?? DEFAULT_ENTITY_SELECTOR,
                mappingStatus: 'mapped',
                mappingSource: decision.source,
                confidence: decision.confidence,
              }
            : {
                defaultFieldDefinitionId: null,
                defaultEntitySelector: null,
                mappingStatus:
                  decision.decision === 'unmapped'
                    ? 'unmapped'
                    : 'needs_review',
                mappingSource: decision.source,
                confidence: decision.confidence,
              },
        });
        if (mapped && definition.currentProfileKey) {
          await tx.lawfirmTemplateField.updateMany({
            where: {
              documentSlots: { some: { templateSetFieldId: decision.id } },
            },
            data: {
              mappedKey: definition.currentProfileKey,
              source: decision.source === 'gemini' ? 'ai' : 'auto',
            },
          });
        }
        if (
          decision.source !== 'gemini' ||
          !mapped ||
          decision.confidence < CACHE_CONFIDENCE
        ) {
          continue;
        }
        const slot = slotById.get(decision.id);
        if (!slot) continue;
        const cacheKey = mappingCacheKey({
          semanticFingerprint: slot.semanticFingerprint,
          taxonomyVersion,
          promptVersion: PROMPT_VERSION,
          modelName,
        });
        await tx.lawfirmMappingCache.upsert({
          where: { workspaceId_cacheKey: { workspaceId, cacheKey } },
          create: {
            workspaceId,
            cacheKey,
            semanticFingerprint: slot.semanticFingerprint,
            taxonomyVersion,
            promptVersion: PROMPT_VERSION,
            modelName,
            fieldDefinitionId: definition.id,
            entitySelector: decision.entitySelector,
            confidence: decision.confidence,
          },
          update: {
            fieldDefinitionId: definition.id,
            entitySelector: decision.entitySelector,
            confidence: decision.confidence,
            lastUsedAt: new Date(),
          },
        });
      }
    });
  }
}
