import { LawfirmMappingService } from './lawfirm-mapping.service';

describe('LawfirmMappingService', () => {
  it('summarizes persisted mapping state without calling Gemini', async () => {
    const prisma = {
      lawfirmTemplateSet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'set-1',
          workspaceId: 'workspace-1',
        }),
      },
      lawfirmTemplateSetField: {
        findMany: jest.fn().mockResolvedValue([
          { mappingStatus: 'mapped', _count: { documentSlots: 3 } },
          { mappingStatus: 'unmapped', _count: { documentSlots: 2 } },
          { mappingStatus: 'needs_review', _count: { documentSlots: 1 } },
        ]),
      },
      lawfirmMappingJob: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const gateway = { resolve: jest.fn() };
    const service = new LawfirmMappingService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
      gateway as never,
      { rebuild: jest.fn() } as never,
    );

    const summary = await service.getTemplateSetSummary('user-1', 'set-1');

    expect(summary).toMatchObject({
      total_unique_fields: 3,
      mapped_fields: 1,
      unresolved_fields: 2,
      needs_review_fields: 1,
      occurrences: 6,
      estimated_gemini_calls: 1,
    });
    expect(gateway.resolve).not.toHaveBeenCalled();
  });

  it('reuses the durable logical job for the same set revision and input', async () => {
    const completedJob = {
      id: 'job-1',
      workspaceId: 'workspace-1',
      templateSetId: 'set-1',
      status: 'completed',
      result: { decisions: [] },
      errorMessage: null,
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      lawfirmTemplateSet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'set-1',
          workspaceId: 'workspace-1',
          revision: 3,
        }),
      },
      lawfirmTemplateSetField: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'slot-1',
            normalizedSlot: 'ma so thue',
            mappingStatus: 'unmapped',
            contextFingerprint: 'context-1',
          },
        ]),
      },
      lawfirmMappingJob: {
        findUnique: jest.fn().mockResolvedValue(completedJob),
      },
    };
    const gateway = { resolve: jest.fn() };
    const service = new LawfirmMappingService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
      gateway as never,
      { rebuild: jest.fn() } as never,
    );

    const result = await service.resolveTemplateSet('user-1', 'set-1');

    expect(result.cached).toBe(true);
    expect(result.job_id).toBe('job-1');
    expect(gateway.resolve).not.toHaveBeenCalled();
  });
});
