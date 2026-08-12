import { LawfirmTemplateScanWorkerService } from './lawfirm-template-scan-worker.service';

describe('LawfirmTemplateScanWorkerService', () => {
  it('claims and completes a durable parse job', async () => {
    const scanJobFindFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'job-1' })
      .mockResolvedValue(null);
    const scanJobUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      lawfirmTemplateScanJob: {
        findFirst: scanJobFindFirst,
        updateMany: scanJobUpdateMany,
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          uploadSessionId: 'session-1',
          documentId: 'document-1',
          kind: 'parse_document',
          status: 'processing',
          attempts: 1,
          maxAttempts: 3,
          uploadSession: {
            id: 'session-1',
            status: 'queued',
            templateSetId: 'set-1',
            templateSet: { workspaceId: 'workspace-1' },
          },
          document: {
            id: 'document-1',
            storageKey: 'templates/file.docx',
            fileType: 'docx',
            fileName: 'file.docx',
          },
        }),
      },
      lawfirmTemplateField: { deleteMany: jest.fn() },
      lawfirmTemplateDocument: { update: jest.fn() },
      lawfirmTemplateUploadSession: { update: jest.fn() },
    };
    const transaction = jest.fn(
      (callback: (tx: typeof prisma) => Promise<void>): Promise<void> =>
        callback(prisma),
    );
    const prismaWithTransaction = { ...prisma, $transaction: transaction };
    const scanService = {
      analyzeUploadedTemplateFile: jest.fn().mockResolvedValue({
        fileType: 'docx',
        plainText: '[TÊN CÔNG TY]',
        fields: [
          {
            label: 'Tên công ty',
            placeholder: '[TÊN CÔNG TY]',
            mappedKey: 'f_to_ten',
            count: 1,
          },
        ],
      }),
    };
    const worker = new LawfirmTemplateScanWorkerService(
      prismaWithTransaction as never,
      scanService as never,
      {} as never,
      {
        downloadBuffer: jest.fn().mockResolvedValue(Buffer.from('docx')),
      } as never,
    );

    await worker.tick();

    expect(prisma.lawfirmTemplateDocument.update).toHaveBeenCalledTimes(1);
    expect(prisma.lawfirmTemplateUploadSession.update).toHaveBeenCalledTimes(1);
    expect(scanJobUpdateMany).toHaveBeenCalledTimes(2);
  });
});
