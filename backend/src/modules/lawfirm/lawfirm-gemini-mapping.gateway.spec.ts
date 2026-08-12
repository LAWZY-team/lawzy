import { LawfirmGeminiMappingGateway } from './lawfirm-gemini-mapping.gateway';

describe('LawfirmGeminiMappingGateway', () => {
  const setFieldUpdate = jest.fn();
  const legacyUpdate = jest.fn();
  const cacheUpsert = jest.fn();
  const usageRecord = jest.fn();
  const generate = jest.fn();
  const prisma = {
    lawfirmTemplateSetField: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'slot-1',
          displaySlot: 'Mã số thuế',
          normalizedSlot: 'ma so thue',
          documentSlots: [
            {
              documentId: 'doc-1',
              labelText: 'Mã số thuế',
              leftContext: 'Doanh nghiệp',
              rightContext: '',
            },
          ],
        },
      ]),
    },
    lawfirmFieldDefinition: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'tax-id',
          canonicalKey: 'organization.tax_id',
          currentProfileKey: 'f_to_mst',
          group: 'organization',
          labelVi: 'Mã số thuế',
          labelEn: 'Tax ID',
          taxonomyVersion: 1,
          aliases: [{ normalizedAlias: 'ma so thue' }],
        },
      ]),
    },
    lawfirmMappingCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    lawfirmAiUsageEvent: {
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        lawfirmTemplateSetField: { update: setFieldUpdate },
        lawfirmTemplateField: { updateMany: legacyUpdate },
        lawfirmMappingCache: { upsert: cacheUpsert },
      }),
    ),
  };
  const aiProvider = {
    getModelName: jest.fn().mockReturnValue('gemini-flash'),
    generateContentWithRetry: generate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists only a registry-constrained canonical mapping and records exact usage', async () => {
    generate.mockResolvedValue({
      text: JSON.stringify({
        mappings: [
          {
            id: 'slot-1',
            decision: 'mapped',
            canonicalKey: 'organization.tax_id',
            entitySelector: 'root',
            confidence: 0.96,
            reasonCode: 'TAX_LABEL',
          },
        ],
      }),
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 24,
        cachedContentTokenCount: 5,
        thoughtsTokenCount: 3,
        totalTokenCount: 147,
      },
    });
    const gateway = new LawfirmGeminiMappingGateway(
      prisma as never,
      aiProvider as never,
      { record: usageRecord } as never,
    );

    const result = await gateway.resolve({
      workspaceId: 'workspace-1',
      actorId: 'user-1',
      templateSetId: 'set-1',
      mappingJobId: 'job-1',
      templateSetRevision: 1,
    });

    expect(result.mapped).toBe(1);
    expect(JSON.stringify(setFieldUpdate.mock.calls)).toContain(
      '"defaultFieldDefinitionId":"tax-id"',
    );
    expect(JSON.stringify(setFieldUpdate.mock.calls)).toContain(
      '"mappingStatus":"mapped"',
    );
    expect(legacyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mappedKey: 'f_to_mst', source: 'ai' },
      }),
    );
    expect(cacheUpsert).toHaveBeenCalled();
    expect(usageRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTokens: 120,
        outputTokens: 24,
        cachedTokens: 5,
        thinkingTokens: 3,
        totalTokens: 147,
      }),
    );
  });

  it('rejects a canonical key outside the supplied candidates', async () => {
    generate.mockResolvedValue({
      text: JSON.stringify({
        mappings: [
          {
            id: 'slot-1',
            decision: 'mapped',
            canonicalKey: 'organization.legal_name',
            entitySelector: 'root',
            confidence: 0.99,
            reasonCode: 'WRONG_KEY',
          },
        ],
      }),
      usageMetadata: { totalTokenCount: 10 },
    });
    const gateway = new LawfirmGeminiMappingGateway(
      prisma as never,
      aiProvider as never,
      { record: usageRecord } as never,
    );

    const result = await gateway.resolve({
      workspaceId: 'workspace-1',
      actorId: 'user-1',
      templateSetId: 'set-1',
      mappingJobId: 'job-2',
      templateSetRevision: 1,
    });

    expect(result.mapped).toBe(0);
    expect(JSON.stringify(setFieldUpdate.mock.calls)).toContain(
      '"mappingStatus":"needs_review"',
    );
    expect(legacyUpdate).not.toHaveBeenCalled();
    expect(cacheUpsert).not.toHaveBeenCalled();
  });
});
