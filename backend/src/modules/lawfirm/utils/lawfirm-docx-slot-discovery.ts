import JSZip from 'jszip';
import {
  normalizeLawfirmFieldAlias,
  resolveCurrentProfileFieldKey,
  toCurrentLawfirmProfileFieldKey,
} from '../lawfirm-field-taxonomy';

export type LawfirmSlotSourceKind =
  | 'explicit_placeholder'
  | 'content_control'
  | 'bookmark'
  | 'merge_field'
  | 'blank_line'
  | 'dotted_blank'
  | 'empty_table_cell'
  | 'literal_value'
  | 'ocr_region';

export interface DiscoveredDocxSlot {
  normalizedSlot: string;
  sourceKind: LawfirmSlotSourceKind;
  rawText: string;
  labelText: string;
  currentValue: string | null;
  mappedKey: string;
  confidence: number;
  leftContext: string;
  rightContext: string;
  anchor: Record<string, string | number>;
}

const DOCX_TEXT_PART =
  /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/u;
const DETECTOR_VERSION = '2.1';

const extractExplicitPlaceholders = (text: string): string[] => {
  const patterns = [
    /\[[^[\]\r\n]{1,80}\]/gu,
    /\{\{[^{}\r\n]{1,80}\}\}/gu,
    /<<[^<>\r\n]{1,80}>>/gu,
    /\$\{[^{}\r\n]{1,80}\}/gu,
    /\$\([^()\r\n]{1,80}\)/gu,
  ];
  return [...new Set(patterns.flatMap((pattern) => text.match(pattern) ?? []))];
};

const guessMapping = (value: string): string =>
  toCurrentLawfirmProfileFieldKey(value) ??
  resolveCurrentProfileFieldKey(value);

const decodeXml = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const textFromXml = (xml: string): string => {
  const pieces: string[] = [];
  const tokenPattern =
    /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)\b[^>]*\/?\s*>/gu;
  for (const match of xml.matchAll(tokenPattern)) {
    pieces.push(match[1] !== undefined ? decodeXml(match[1]) : ' ');
  }
  return pieces.join('').replace(/\s+/g, ' ').trim();
};

const contexts = (text: string, start: number, end: number) => ({
  leftContext: text.slice(Math.max(0, start - 100), start).trim(),
  rightContext: text.slice(end, Math.min(text.length, end + 100)).trim(),
});

const attributeValue = (xml: string, element: string): string => {
  const match = xml.match(
    new RegExp(`<w:${element}\\b[^>]*\\bw:val=["']([^"']+)["']`, 'u'),
  );
  return match ? decodeXml(match[1]).trim() : '';
};

const labelFromControlName = (value: string): string =>
  value
    .replace(/^lawzy:/iu, '')
    .replace(/[_-]+/g, ' ')
    .trim();

export async function discoverDocxSlots(
  buffer: Buffer | ArrayBuffer,
): Promise<DiscoveredDocxSlot[]> {
  const zip = await JSZip.loadAsync(buffer);
  const partNames = Object.keys(zip.files)
    .filter((name) => DOCX_TEXT_PART.test(name))
    .sort((left, right) =>
      left === 'word/document.xml'
        ? -1
        : right === 'word/document.xml'
          ? 1
          : left.localeCompare(right),
    );
  const discovered: DiscoveredDocxSlot[] = [];
  const seen = new Set<string>();

  const add = (
    slot: Omit<DiscoveredDocxSlot, 'normalizedSlot' | 'mappedKey'> & {
      normalizedValue?: string;
      mappingValue?: string;
    },
  ) => {
    const { normalizedValue, mappingValue, ...occurrence } = slot;
    const normalizedSlot = normalizeLawfirmFieldAlias(
      normalizedValue || slot.labelText || slot.rawText,
    );
    if (!normalizedSlot || normalizedSlot.length > 191) return;
    const key = [
      slot.anchor.part,
      slot.sourceKind,
      slot.anchor.paragraphIndex ?? slot.anchor.controlIndex ?? '',
      slot.anchor.tableIndex ?? '',
      slot.anchor.rowIndex ?? '',
      slot.anchor.cellIndex ?? '',
      slot.anchor.matchStart ?? '',
      normalizedSlot,
    ].join(':');
    if (seen.has(key)) return;
    seen.add(key);
    discovered.push({
      ...occurrence,
      normalizedSlot,
      mappedKey: guessMapping(mappingValue || slot.labelText || slot.rawText),
    });
  };

  for (const part of partNames) {
    const file = zip.file(part);
    if (!file) continue;
    const xml = await file.async('text');
    const paragraphs = [...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gu)];

    for (const [paragraphIndex, paragraphMatch] of paragraphs.entries()) {
      const paragraphXml = paragraphMatch[0];
      const paragraphText = textFromXml(paragraphXml);

      for (const placeholder of extractExplicitPlaceholders(paragraphText)) {
        let start = paragraphText.indexOf(placeholder);
        while (start >= 0) {
          add({
            sourceKind: 'explicit_placeholder',
            rawText: placeholder,
            labelText: placeholder,
            currentValue: null,
            confidence: 1,
            ...contexts(paragraphText, start, start + placeholder.length),
            anchor: {
              part,
              paragraphIndex,
              matchStart: start,
              matchEnd: start + placeholder.length,
              detectorVersion: DETECTOR_VERSION,
            },
          });
          start = paragraphText.indexOf(
            placeholder,
            start + placeholder.length,
          );
        }
      }

      for (const mergeMatch of paragraphXml.matchAll(
        /<w:instrText\b[^>]*>[\s\S]*?MERGEFIELD\s+(?:&quot;|"|')?([^\s\\<&"']+)/giu,
      )) {
        const rawName = decodeXml(mergeMatch[1]).trim();
        const labelText = labelFromControlName(rawName);
        add({
          sourceKind: 'merge_field',
          rawText: rawName,
          labelText,
          normalizedValue: labelText,
          mappingValue: rawName,
          currentValue: null,
          confidence: 1,
          ...contexts(paragraphText, 0, paragraphText.length),
          anchor: {
            part,
            paragraphIndex,
            matchStart: mergeMatch.index,
            detectorVersion: DETECTOR_VERSION,
          },
        });
      }

      for (const bookmarkMatch of paragraphXml.matchAll(
        /<w:bookmarkStart\b[^>]*\bw:name=["']([^"']+)["'][^>]*>/giu,
      )) {
        const rawName = decodeXml(bookmarkMatch[1]).trim();
        if (!rawName || rawName.startsWith('_')) continue;
        const labelText = labelFromControlName(rawName);
        add({
          sourceKind: 'bookmark',
          rawText: rawName,
          labelText,
          normalizedValue: labelText,
          mappingValue: rawName,
          currentValue: null,
          confidence: 0.95,
          ...contexts(paragraphText, 0, paragraphText.length),
          anchor: {
            part,
            paragraphIndex,
            matchStart: bookmarkMatch.index,
            detectorVersion: DETECTOR_VERSION,
          },
        });
      }

      const blankPattern =
        /([^:;|]{2,80}?)\s*[:：]?\s*((?:\.{3,}|_{3,}|…{2,}))/gu;
      for (const blankMatch of paragraphText.matchAll(blankPattern)) {
        const labelText = blankMatch[1].trim();
        if (!/[\p{L}\p{N}]/u.test(labelText)) continue;
        const rawText = blankMatch[2];
        const blankStart =
          (blankMatch.index ?? 0) + blankMatch[0].lastIndexOf(rawText);
        add({
          sourceKind:
            rawText.includes('.') || rawText.includes('…')
              ? 'dotted_blank'
              : 'blank_line',
          rawText,
          labelText,
          normalizedValue: labelText,
          currentValue: null,
          confidence: 0.9,
          ...contexts(paragraphText, blankStart, blankStart + rawText.length),
          anchor: {
            part,
            paragraphIndex,
            matchStart: blankStart,
            matchEnd: blankStart + rawText.length,
            detectorVersion: DETECTOR_VERSION,
          },
        });
      }

      const literalMatch = paragraphText.match(
        /^\s*([^:：]{2,60})\s*[:：]\s*(\S.{0,120})\s*$/u,
      );
      if (
        literalMatch &&
        extractExplicitPlaceholders(paragraphText).length === 0
      ) {
        const labelText = literalMatch[1].trim();
        const currentValue = literalMatch[2].trim();
        const mappedKey = guessMapping(labelText);
        if (mappedKey && !/^(?:\.{3,}|_{3,}|…{2,})$/u.test(currentValue)) {
          const valueStart = paragraphText.lastIndexOf(currentValue);
          add({
            sourceKind: 'literal_value',
            rawText: currentValue,
            labelText,
            normalizedValue: labelText,
            currentValue,
            confidence: 0.6,
            ...contexts(
              paragraphText,
              valueStart,
              valueStart + currentValue.length,
            ),
            anchor: {
              part,
              paragraphIndex,
              matchStart: valueStart,
              matchEnd: valueStart + currentValue.length,
              detectorVersion: DETECTOR_VERSION,
            },
          });
        }
      }
    }

    for (const [controlIndex, controlMatch] of [
      ...xml.matchAll(/<w:sdt\b[^>]*>[\s\S]*?<\/w:sdt>/gu),
    ].entries()) {
      const controlXml = controlMatch[0];
      const controlText = textFromXml(controlXml);
      if (extractExplicitPlaceholders(controlText).length > 0) continue;
      const rawName =
        attributeValue(controlXml, 'tag') ||
        attributeValue(controlXml, 'alias');
      if (!rawName) continue;
      const labelText = labelFromControlName(rawName);
      add({
        sourceKind: 'content_control',
        rawText: rawName,
        labelText,
        normalizedValue: labelText,
        mappingValue: rawName,
        currentValue: controlText || null,
        confidence: 1,
        leftContext: '',
        rightContext: '',
        anchor: {
          part,
          controlIndex,
          matchStart: controlMatch.index ?? 0,
          detectorVersion: DETECTOR_VERSION,
        },
      });
    }

    const tables = [...xml.matchAll(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gu)];
    for (const [tableIndex, tableMatch] of tables.entries()) {
      const rows = [
        ...tableMatch[0].matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gu),
      ];
      for (const [rowIndex, rowMatch] of rows.entries()) {
        const cells = [
          ...rowMatch[0].matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gu),
        ];
        const cellTexts = cells.map((cell) => textFromXml(cell[0]));
        for (let cellIndex = 1; cellIndex < cellTexts.length; cellIndex += 1) {
          const labelText = cellTexts[cellIndex - 1].trim();
          if (!labelText || cellTexts[cellIndex].trim()) continue;
          add({
            sourceKind: 'empty_table_cell',
            rawText: '',
            labelText,
            normalizedValue: labelText,
            currentValue: null,
            confidence: 0.85,
            leftContext: labelText,
            rightContext: '',
            anchor: {
              part,
              tableIndex,
              rowIndex,
              cellIndex,
              detectorVersion: DETECTOR_VERSION,
            },
          });
        }
      }
    }
  }

  return discovered;
}
