import { BadRequestException } from '@nestjs/common';
import { LawfirmFillRunsService } from './lawfirm-fill-runs.service';

describe('LawfirmFillRunsService preflight', () => {
  it('returns structured conflicts before creating a fill run', async () => {
    const prisma = {
      lawfirmClientProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          workspaceId: 'workspace-1',
          fields: [
            { id: 'a', fieldKey: 'tax_id', value: '0101' },
            { id: 'b', fieldKey: 'f_to_mst', value: '0202' },
          ],
        }),
      },
      lawfirmTemplateSet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'template-1',
          workspaceId: 'workspace-1',
          visibility: 'private',
          documents: [
            {
              id: 'document-1',
              fileType: 'docx',
              fields: [],
            },
          ],
        }),
      },
      lawfirmFillRun: { create: jest.fn() },
    };
    const workspaceAccess = { requireMembership: jest.fn() };
    const service = new LawfirmFillRunsService(
      prisma as never,
      workspaceAccess as never,
      {} as never,
      {} as never,
    );

    let caught: unknown;
    try {
      await service.create('user-1', {
        workspaceId: 'workspace-1',
        profileId: 'profile-1',
        templateSetId: 'template-1',
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).getResponse()).toMatchObject({
      issues: [
        expect.objectContaining({
          code: 'PROFILE_CANONICAL_VALUE_CONFLICT',
          fieldKey: 'f_to_mst',
        }),
      ],
    });
    expect(prisma.lawfirmFillRun.create).not.toHaveBeenCalled();
  });
});
