import { BadRequestException } from '@nestjs/common';
import { LawfirmExtractionsService } from './lawfirm-extractions.service';

const pendingExtraction = () => ({
  id: 'extraction-1',
  workspaceId: 'workspace-1',
  profileId: 'profile-1',
  status: 'pending',
  profile: {
    fields: [
      {
        id: 'profile-field-1',
        fieldKey: 'f_to_mst',
        value: '',
      },
    ],
  },
});

describe('LawfirmExtractionsService approval validation', () => {
  it('rejects an AI-invented field key before profile writes', async () => {
    const tx = {
      lawfirmProfileField: {
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      lawfirmAiExtraction: {
        findUnique: jest.fn().mockResolvedValue(pendingExtraction()),
      },
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<void>) =>
          callback(tx),
      ),
    };
    const service = new LawfirmExtractionsService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
      {} as never,
    );

    await expect(
      service.approve('user-1', 'extraction-1', {
        approvedFields: [
          {
            fieldKey: 'gemini_invented_key',
            label: 'Invented',
            value: 'value',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.lawfirmProfileField.update).not.toHaveBeenCalled();
    expect(tx.lawfirmProfileField.create).not.toHaveBeenCalled();
  });
});
