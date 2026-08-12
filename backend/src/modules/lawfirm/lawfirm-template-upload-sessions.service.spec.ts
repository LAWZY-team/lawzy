import { BadRequestException } from '@nestjs/common';
import { LawfirmTemplateUploadSessionsService } from './lawfirm-template-upload-sessions.service';

const now = new Date('2026-08-11T00:00:00.000Z');

const session = {
  id: 'session-1',
  templateSetId: 'set-1',
  createdBy: 'user-1',
  idempotencyKey: 'template-upload:set-1:request-1',
  status: 'receiving',
  totalDocuments: 2,
  processedDocuments: 1,
  failedDocuments: 0,
  finalizedAt: null,
  completedAt: null,
  createdAt: now,
  updatedAt: now,
  templateSet: { workspaceId: 'workspace-1' },
};

describe('LawfirmTemplateUploadSessionsService', () => {
  it('returns the persisted session for a repeated idempotency key', async () => {
    const prisma = {
      lawfirmTemplateSet: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'set-1', workspaceId: 'workspace-1' }),
      },
      lawfirmTemplateUploadSession: {
        findUnique: jest.fn().mockResolvedValue(session),
        create: jest.fn(),
      },
    };
    const workspaceAccess = { requireMembership: jest.fn() };
    const service = new LawfirmTemplateUploadSessionsService(
      prisma as never,
      workspaceAccess as never,
      {} as never,
      {} as never,
    );

    const result = await service.create('user-1', {
      templateSetId: 'set-1',
      idempotencyKey: 'request-1',
    });

    expect(result.session_id).toBe('session-1');
    expect(prisma.lawfirmTemplateUploadSession.create).not.toHaveBeenCalled();
    expect(workspaceAccess.requireMembership).toHaveBeenCalledWith(
      'workspace-1',
      'user-1',
    );
  });

  it('enforces the session document limit before uploading', async () => {
    const prisma = {
      lawfirmTemplateUploadSession: {
        findUnique: jest.fn().mockResolvedValue({
          ...session,
          totalDocuments: 20,
        }),
      },
    };
    const service = new LawfirmTemplateUploadSessionsService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.addDocuments('user-1', 'session-1', [
        { originalname: 'file.docx' } as Express.Multer.File,
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('restores progress and job state entirely from the database', async () => {
    const prisma = {
      lawfirmTemplateUploadSession: {
        findUnique: jest.fn().mockResolvedValue(session),
      },
      lawfirmTemplateDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      lawfirmTemplateScanJob: {
        groupBy: jest.fn().mockResolvedValue([
          {
            kind: 'parse_document',
            status: 'queued',
            _count: { _all: 1 },
          },
        ]),
      },
    };
    const service = new LawfirmTemplateUploadSessionsService(
      prisma as never,
      { requireMembership: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    const result = await service.getStatus('user-1', 'session-1');

    expect(result.progress).toEqual({
      total: 2,
      processed: 1,
      failed: 0,
      pending: 1,
    });
    expect(result.jobs).toEqual([
      { kind: 'parse_document', status: 'queued', count: 1 },
    ]);
  });
});
