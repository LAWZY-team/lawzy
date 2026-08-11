import { ConflictException } from '@nestjs/common';
import { LawfirmFieldRegistryService } from './lawfirm-field-registry.service';

describe('LawfirmFieldRegistryService', () => {
  it('creates a workspace-scoped custom field with normalized aliases', async () => {
    interface CreateCall {
      data: {
        canonicalKey: string;
        registryKey: string;
        aliases: {
          create: Array<{ alias: string; normalizedAlias: string }>;
        };
      };
    }

    let capturedCall: CreateCall | undefined;
    const create = jest.fn(
      (args: CreateCall): Promise<{ id: string; aliases: never[] }> => {
        capturedCall = args;
        return Promise.resolve({ id: 'definition-1', aliases: [] });
      },
    );
    const prisma = {
      lawfirmFieldAlias: { findFirst: jest.fn().mockResolvedValue(null) },
      lawfirmFieldDefinition: { create },
    };
    const workspaceAccess = { requireMembership: jest.fn() };
    const service = new LawfirmFieldRegistryService(
      prisma as never,
      workspaceAccess as never,
    );

    await service.createCustom('user-1', {
      workspaceId: 'workspace-1',
      labelVi: 'Số tài khoản ngân hàng',
      group: 'organization',
      dataType: 'string',
      aliases: [{ value: 'STK' }, { value: 'Số tài khoản' }],
    });

    expect(workspaceAccess.requireMembership).toHaveBeenCalledWith(
      'workspace-1',
      'user-1',
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(capturedCall).toBeDefined();
    const createdData = capturedCall?.data;
    expect(createdData?.canonicalKey).toMatch(/^custom-[0-9a-f-]{36}$/);
    expect(createdData?.registryKey).toMatch(
      /^workspace:workspace-1:custom-[0-9a-f-]{36}$/,
    );
    expect(createdData?.aliases.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alias: 'Số tài khoản ngân hàng',
          normalizedAlias: 'SỐ TÀI KHOẢN NGÂN HÀNG',
        }),
        expect.objectContaining({
          alias: 'STK',
          normalizedAlias: 'STK',
        }),
      ]),
    );
  });

  it('rejects a duplicate workspace alias', async () => {
    const prisma = {
      lawfirmFieldAlias: {
        findFirst: jest.fn().mockResolvedValue({
          fieldDefinition: { canonicalKey: 'custom-existing' },
        }),
      },
      lawfirmFieldDefinition: { create: jest.fn() },
    };
    const service = new LawfirmFieldRegistryService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
    );

    await expect(
      service.createCustom('user-1', {
        workspaceId: 'workspace-1',
        labelVi: 'STK',
        group: 'organization',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lawfirmFieldDefinition.create).not.toHaveBeenCalled();
  });

  it('returns all candidates for an ambiguous alias', async () => {
    const definitions = [
      { canonicalKey: 'person.email' },
      { canonicalKey: 'organization.email' },
    ];
    const prisma = {
      lawfirmFieldAlias: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            definitions.map((fieldDefinition) => ({ fieldDefinition })),
          ),
      },
    };
    const service = new LawfirmFieldRegistryService(
      prisma as never,
      {} as never,
    );

    await expect(
      service.resolveCandidates('workspace-1', '[EMAIL]'),
    ).resolves.toEqual(definitions);
  });
});
