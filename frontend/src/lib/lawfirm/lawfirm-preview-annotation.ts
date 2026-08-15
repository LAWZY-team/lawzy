export type LawfirmPreviewAnchor = Record<string, unknown> | null;

export type LawfirmPreviewOccurrence = {
  fieldId: string;
  occurrenceKey: string;
  label: string;
  rawText: string;
  currentValue: string | null;
  anchor: LawfirmPreviewAnchor;
};

const readNumber = (anchor: LawfirmPreviewAnchor, key: string): number | null => {
  const value = anchor?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const uniqueTextOffset = (value: string, text: string): number | null => {
  const first = value.indexOf(text);
  return first >= 0 && first === value.lastIndexOf(text) ? first : null;
};

const markTextAtOffset = (
  document: Document,
  paragraph: Element,
  offset: number,
  text: string,
  occurrence: LawfirmPreviewOccurrence,
): boolean => {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const value = textNode.nodeValue ?? "";
    const start = offset - cursor;
    if (start >= 0 && start + text.length <= value.length) {
      if (value.slice(start, start + text.length) !== text) return false;
      if (textNode.parentElement?.closest("mark")) return false;
      const selected = textNode.splitText(start);
      const tail = selected.splitText(text.length);
      const mark = document.createElement("mark");
      mark.className = "lawfirm-field-mark rounded-sm bg-blue-100 px-0.5 text-zinc-950";
      mark.dataset.fieldId = occurrence.fieldId;
      mark.dataset.occurrenceKey = occurrence.occurrenceKey;
      mark.dataset.annotationMode = "anchor";
      mark.setAttribute("role", "button");
      mark.setAttribute("tabindex", "0");
      mark.setAttribute("aria-label", `Field: ${occurrence.label}`);
      selected.parentNode?.replaceChild(mark, selected);
      mark.append(selected);
      void tail;
      return true;
    }
    cursor += value.length;
  }
  return false;
};

/**
 * Maps OOXML paragraph/inline anchors to Mammoth paragraph output. Callers may
 * use text matching only for occurrences returned as unresolved.
 */
export function annotateLawfirmPreviewByAnchor(
  document: Document,
  root: Element,
  occurrences: readonly LawfirmPreviewOccurrence[],
): Set<string> {
  const paragraphs = Array.from(root.querySelectorAll("p"));
  const resolved = new Set<string>();
  const candidates = occurrences
    .map((occurrence) => ({
      occurrence,
      part: occurrence.anchor?.part,
      paragraphIndex: readNumber(occurrence.anchor, "paragraphIndex"),
      inlineOffset:
        readNumber(occurrence.anchor, "inlineOffset") ??
        readNumber(occurrence.anchor, "matchStart"),
      tableIndex: readNumber(occurrence.anchor, "tableIndex"),
      rowIndex: readNumber(occurrence.anchor, "rowIndex"),
      cellIndex: readNumber(occurrence.anchor, "cellIndex"),
      text: (occurrence.currentValue || occurrence.rawText || occurrence.label).trim(),
    }))
    .filter(
      (candidate): candidate is typeof candidate & { paragraphIndex: number; inlineOffset: number; text: string } =>
        candidate.part === "word/document.xml" &&
        Boolean(candidate.text) &&
        (candidate.paragraphIndex !== null ||
          (candidate.tableIndex !== null && candidate.rowIndex !== null && candidate.cellIndex !== null)),
    )
    .sort(
      (left, right) =>
        right.paragraphIndex - left.paragraphIndex ||
        right.inlineOffset - left.inlineOffset ||
        right.occurrence.occurrenceKey.localeCompare(left.occurrence.occurrenceKey),
    );

  for (const candidate of candidates) {
    const paragraph =
      candidate.paragraphIndex !== null ? paragraphs[candidate.paragraphIndex] : null;
    const paragraphOffset =
      candidate.inlineOffset ??
      (paragraph ? uniqueTextOffset(paragraph.textContent ?? "", candidate.text) : null);
    if (
      paragraph &&
      paragraphOffset !== null &&
      markTextAtOffset(
        document,
        paragraph,
        paragraphOffset,
        candidate.text,
        candidate.occurrence,
      )
    ) {
      resolved.add(candidate.occurrence.occurrenceKey);
      continue;
    }
    if (
      candidate.tableIndex === null ||
      candidate.rowIndex === null ||
      candidate.cellIndex === null
    ) continue;
    const cell = root.querySelectorAll("table")[candidate.tableIndex]?.rows[candidate.rowIndex]?.cells[
      Math.max(0, candidate.cellIndex - 1)
    ];
    const cellOffset = cell?.textContent?.indexOf(candidate.text) ?? -1;
    if (cell && cellOffset >= 0 && markTextAtOffset(document, cell, cellOffset, candidate.text, candidate.occurrence)) {
      resolved.add(candidate.occurrence.occurrenceKey);
    }
  }
  return resolved;
}