export type LawfirmSourceAnchor = Record<string, unknown> | null | undefined;

const finiteNumber = (value: unknown, fallback = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const lawfirmPartRank = (part: unknown): number => {
  if (typeof part !== 'string') return 900;
  if (part === 'word/document.xml') return 0;
  if (/^word\/header\d*\.xml$/u.test(part)) return 100;
  if (part === 'word/footnotes.xml') return 200;
  if (part === 'word/endnotes.xml') return 210;
  if (/^word\/footer\d*\.xml$/u.test(part)) return 300;
  if (part.startsWith('word/media/')) return 400;
  return 800;
};

export const lawfirmSourceOrderTuple = (
  anchor: LawfirmSourceAnchor,
): readonly number[] => {
  const value = anchor ?? {};
  return [
    lawfirmPartRank(value.part),
    finiteNumber(value.pageIndex, 0),
    finiteNumber(value.xmlOffset),
    finiteNumber(value.blockIndex),
    finiteNumber(value.paragraphIndex),
    finiteNumber(value.tableIndex),
    finiteNumber(value.rowIndex),
    finiteNumber(value.cellIndex),
    finiteNumber(value.controlIndex),
    finiteNumber(value.matchStart),
    finiteNumber(value.regionIndex),
    finiteNumber(value.y),
    finiteNumber(value.x),
  ];
};

export const compareLawfirmSourceAnchors = (
  left: LawfirmSourceAnchor,
  right: LawfirmSourceAnchor,
): number => {
  const leftTuple = lawfirmSourceOrderTuple(left);
  const rightTuple = lawfirmSourceOrderTuple(right);
  for (let index = 0; index < leftTuple.length; index += 1) {
    const difference = leftTuple[index] - rightTuple[index];
    if (difference !== 0) return difference;
  }
  return 0;
};

type DiscoveryOccurrence = { anchor?: LawfirmSourceAnchor };

export const readLawfirmDiscoveryOccurrences = (
  discovery: unknown,
): DiscoveryOccurrence[] => {
  if (!discovery || typeof discovery !== 'object') return [];
  const occurrences = (discovery as { occurrences?: unknown }).occurrences;
  if (!Array.isArray(occurrences)) return [];
  return occurrences.filter((occurrence): occurrence is DiscoveryOccurrence =>
    Boolean(occurrence && typeof occurrence === 'object'),
  );
};

export const compareLawfirmFieldsBySourceOrder = (
  left: { id?: string; sortOrder?: number; discovery?: unknown },
  right: { id?: string; sortOrder?: number; discovery?: unknown },
): number => {
  const leftAnchor = readLawfirmDiscoveryOccurrences(left.discovery)[0]?.anchor;
  const rightAnchor = readLawfirmDiscoveryOccurrences(right.discovery)[0]
    ?.anchor;
  if (leftAnchor && rightAnchor) {
    const anchorOrder = compareLawfirmSourceAnchors(leftAnchor, rightAnchor);
    if (anchorOrder !== 0) return anchorOrder;
  } else if (leftAnchor) {
    return -1;
  } else if (rightAnchor) {
    return 1;
  }
  const persistedOrder =
    finiteNumber(left.sortOrder) - finiteNumber(right.sortOrder);
  if (persistedOrder !== 0) return persistedOrder;
  return String(left.id ?? '').localeCompare(String(right.id ?? ''));
};
