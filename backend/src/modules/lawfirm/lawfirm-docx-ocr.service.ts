import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { PrismaService } from '../../integrations/prisma/prisma.service';
import { OcrExtractor } from '../source-processing/extractors/ocr.extractor';
import { normalizeLawfirmFieldAlias } from './lawfirm-field-taxonomy';
import type { DiscoveredDocxSlot } from './utils/lawfirm-docx-slot-discovery';
import {
  cleanPlaceholderLabel,
  extractPlaceholders,
  guessCanonicalMapping,
} from './utils/lawfirm-placeholder-detector';

const OCR_ENGINE_VERSION = 'tesseract-vie-eng-v1';
const MAX_OCR_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_TEXT_LENGTH_FOR_IMAGE_SKIP = 200;
const RASTER_IMAGE = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/iu;

@Injectable()
export class LawfirmDocxOcrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrExtractor: OcrExtractor,
  ) {}

  async discover(params: {
    workspaceId: string;
    buffer: Buffer;
    extractedText: string;
    structuredSlotCount: number;
  }): Promise<DiscoveredDocxSlot[]> {
    if (
      params.structuredSlotCount > 0 &&
      params.extractedText.trim().length >= MIN_TEXT_LENGTH_FOR_IMAGE_SKIP
    ) {
      return [];
    }

    const zip = await JSZip.loadAsync(params.buffer);
    const imageNames = Object.keys(zip.files)
      .filter(
        (name) => name.startsWith('word/media/') && RASTER_IMAGE.test(name),
      )
      .slice(0, MAX_OCR_IMAGES);
    const slots: DiscoveredDocxSlot[] = [];

    for (const [imageIndex, imageName] of imageNames.entries()) {
      const image = zip.file(imageName);
      if (!image) continue;
      const imageBuffer = await image.async('nodebuffer');
      if (!imageBuffer.length || imageBuffer.length > MAX_IMAGE_BYTES) continue;
      const imageHash = createHash('sha256').update(imageBuffer).digest('hex');
      const cached = await this.prisma.lawfirmOcrCache.findUnique({
        where: {
          workspaceId_imageHash: {
            workspaceId: params.workspaceId,
            imageHash,
          },
        },
      });
      const reusableCache = cached?.engineVersion === OCR_ENGINE_VERSION;
      const ocr = reusableCache
        ? { text: cached.text, confidence: cached.confidence }
        : await this.ocrExtractor.ocrFromBuffer(imageBuffer);
      if (!reusableCache) {
        await this.prisma.lawfirmOcrCache.upsert({
          where: {
            workspaceId_imageHash: {
              workspaceId: params.workspaceId,
              imageHash,
            },
          },
          create: {
            workspaceId: params.workspaceId,
            imageHash,
            text: ocr.text,
            confidence: ocr.confidence,
            engineVersion: OCR_ENGINE_VERSION,
          },
          update: {
            text: ocr.text,
            confidence: ocr.confidence,
            engineVersion: OCR_ENGINE_VERSION,
          },
        });
      }
      if (!ocr.text.trim()) continue;
      slots.push(
        ...this.discoverOcrText(ocr.text, ocr.confidence, {
          imageName,
          imageHash,
          imageIndex,
        }),
      );
    }
    return slots;
  }

  private discoverOcrText(
    text: string,
    confidence: number,
    image: { imageName: string; imageHash: string; imageIndex: number },
  ): DiscoveredDocxSlot[] {
    const slots: DiscoveredDocxSlot[] = [];
    const normalizedConfidence = Math.max(0, Math.min(1, confidence / 100));
    let regionIndex = 0;
    const add = (input: {
      rawText: string;
      labelText: string;
      currentValue: string | null;
      detectorKind: string;
      confidenceFactor: number;
    }) => {
      const normalizedSlot = normalizeLawfirmFieldAlias(input.labelText);
      if (!normalizedSlot || normalizedSlot.length > 191) return;
      slots.push({
        normalizedSlot,
        sourceKind: 'ocr_region',
        rawText: input.rawText,
        labelText: input.labelText,
        currentValue: input.currentValue,
        mappedKey: guessCanonicalMapping(input.labelText),
        confidence: normalizedConfidence * input.confidenceFactor,
        leftContext: '',
        rightContext: '',
        anchor: {
          part: image.imageName,
          imageHash: image.imageHash,
          imageIndex: image.imageIndex,
          regionIndex: regionIndex++,
          detectorKind: input.detectorKind,
          detectorVersion: '2.1-ocr',
        },
      });
    };

    for (const placeholder of extractPlaceholders(text)) {
      add({
        rawText: placeholder,
        labelText: cleanPlaceholderLabel(placeholder),
        currentValue: null,
        detectorKind: 'explicit_placeholder',
        confidenceFactor: 1,
      });
    }
    for (const line of text.split(/\r?\n/u)) {
      const blank = line.match(
        /^\s*([^:：]{2,80})\s*[:：]?\s*(\.{3,}|_{3,}|…{2,})\s*$/u,
      );
      if (blank) {
        add({
          rawText: blank[2],
          labelText: blank[1].trim(),
          currentValue: null,
          detectorKind: 'dotted_blank',
          confidenceFactor: 0.8,
        });
        continue;
      }
      const literal = line.match(
        /^\s*([^:：]{2,60})\s*[:：]\s*(\S.{0,120})\s*$/u,
      );
      if (!literal || !guessCanonicalMapping(literal[1].trim())) continue;
      add({
        rawText: literal[2].trim(),
        labelText: literal[1].trim(),
        currentValue: literal[2].trim(),
        detectorKind: 'literal_value',
        confidenceFactor: 0.55,
      });
    }
    return slots;
  }
}
