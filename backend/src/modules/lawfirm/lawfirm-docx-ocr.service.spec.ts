import JSZip from 'jszip';
import { LawfirmDocxOcrService } from './lawfirm-docx-ocr.service';

const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

const buildDocxWithImage = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document/>');
  zip.file('word/media/image1.png', pngHeader);
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('LawfirmDocxOcrService', () => {
  it('skips OCR when structured discovery is already sufficient', async () => {
    const ocrExtractor = { ocrFromBuffer: jest.fn() };
    const service = new LawfirmDocxOcrService(
      {} as never,
      ocrExtractor as never,
    );

    const result = await service.discover({
      workspaceId: 'workspace-1',
      buffer: Buffer.from('not-a-zip'),
      extractedText: 'x'.repeat(200),
      structuredSlotCount: 1,
    });

    expect(result).toEqual([]);
    expect(ocrExtractor.ocrFromBuffer).not.toHaveBeenCalled();
  });

  it('reuses workspace image-hash cache and emits OCR provenance', async () => {
    const prisma = {
      lawfirmOcrCache: {
        findUnique: jest.fn().mockResolvedValue({
          text: '[MÃ SỐ THUẾ]',
          confidence: 92,
          engineVersion: 'tesseract-vie-eng-v1',
        }),
        upsert: jest.fn(),
      },
    };
    const ocrExtractor = { ocrFromBuffer: jest.fn() };
    const service = new LawfirmDocxOcrService(
      prisma as never,
      ocrExtractor as never,
    );

    const result = await service.discover({
      workspaceId: 'workspace-1',
      buffer: await buildDocxWithImage(),
      extractedText: '',
      structuredSlotCount: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0].sourceKind).toBe('ocr_region');
    expect(result[0].mappedKey).toBe('f_to_mst');
    expect(result[0].confidence).toBe(0.92);
    expect(result[0].anchor.part).toBe('word/media/image1.png');
    expect(result[0].anchor.detectorKind).toBe('explicit_placeholder');
    expect(ocrExtractor.ocrFromBuffer).not.toHaveBeenCalled();
    expect(prisma.lawfirmOcrCache.upsert).not.toHaveBeenCalled();
  });
});
