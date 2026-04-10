import type {
  ContentClauseNode,
  ContentFieldNode,
  ContentHeadingNode,
  ContentParagraphNode,
  ContentTextNode,
  DocContent,
  MergeFieldDefinition,
} from './contract-templates.types';

interface BuildContractTemplateJsonResult {
  contentJSON: DocContent;
  mergeFields: MergeFieldDefinition[];
}

interface PendingClause {
  title: string;
  paragraphs: string[];
}

function normalizeWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ').trim();
}

function splitNonEmptyLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isDividerLine(line: string): boolean {
  return /^[-_=*]{3,}$/.test(line.trim());
}

function isUppercaseHeading(line: string): boolean {
  const letters = line.replace(/[^A-Za-zÀ-ỹ]/g, '');
  if (letters.length < 8) return false;
  return letters === letters.toUpperCase();
}

function isNationalHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes('cộng hòa xã hội chủ nghĩa việt nam') ||
    lower.includes('độc lập - tự do - hạnh phúc')
  );
}

function isClauseHeading(line: string): boolean {
  return /^(điều|article|clause)\s+\d+[\s.:)]/i.test(line);
}

function parseInlineContent(
  line: string,
): Array<ContentTextNode | ContentFieldNode> {
  const content: Array<ContentTextNode | ContentFieldNode> = [];
  const regex = /\{\{([A-Z0-9_]+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(line);
  while (match) {
    if (match.index > lastIndex) {
      content.push({
        type: 'text',
        text: line.slice(lastIndex, match.index),
      });
    }
    content.push({
      type: 'field',
      attrs: {
        fieldKey: match[1],
        label: match[1].replace(/_/g, ' '),
      },
    });
    lastIndex = regex.lastIndex;
    match = regex.exec(line);
  }
  if (lastIndex < line.length) {
    content.push({
      type: 'text',
      text: line.slice(lastIndex),
    });
  }
  if (content.length === 0) {
    content.push({ type: 'text', text: line });
  }
  return content;
}

function buildParagraph(line: string): ContentParagraphNode {
  return {
    type: 'paragraph',
    attrs: { align: 'left' },
    content: parseInlineContent(line),
  };
}

function buildHeading(params: {
  line: string;
  level: 1 | 2 | 3;
  align?: 'left' | 'center';
}): ContentHeadingNode {
  return {
    type: 'heading',
    attrs: {
      level: params.level,
      align: params.align ?? 'left',
    },
    content: parseInlineContent(params.line),
  };
}

function flushClause(
  clause: PendingClause | null,
  clauseIndex: number,
): ContentClauseNode | null {
  if (!clause) return null;
  const content = clause.paragraphs
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean)
    .map((paragraph) => buildParagraph(paragraph));
  if (content.length === 0) return null;
  return {
    type: 'clause',
    attrs: {
      clauseId: `clause_${clauseIndex}`,
      riskLevel: 'low',
      title: clause.title,
    },
    content,
  };
}

export const buildContractTemplateJson = (params: {
  text: string;
  mergeFields: MergeFieldDefinition[];
  defaultTitle: string;
}): BuildContractTemplateJsonResult => {
  const lines = splitNonEmptyLines(params.text);
  const content: DocContent['content'] = [];
  let currentClause: PendingClause | null = null;
  let clauseIndex = 1;
  let headingCount = 0;

  const pushCurrentClause = () => {
    const clauseNode = flushClause(currentClause, clauseIndex);
    if (clauseNode) {
      content.push(clauseNode);
      clauseIndex += 1;
    }
    currentClause = null;
  };

  for (const rawLine of lines) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;
    if (isDividerLine(line)) {
      pushCurrentClause();
      content.push({
        type: 'paragraph',
        attrs: { align: 'center', divider: true },
        content: [],
      });
      continue;
    }
    if (isClauseHeading(line)) {
      pushCurrentClause();
      currentClause = { title: line, paragraphs: [] };
      continue;
    }
    if (currentClause) {
      currentClause.paragraphs.push(line);
      continue;
    }
    const isHeading = isNationalHeader(line) || isUppercaseHeading(line);
    if (isHeading) {
      headingCount += 1;
      const level = headingCount === 1 ? 1 : headingCount <= 3 ? 2 : 3;
      content.push(
        buildHeading({
          line,
          level,
          align: 'center',
        }),
      );
      continue;
    }
    content.push(buildParagraph(line));
  }

  pushCurrentClause();

  if (content.length === 0) {
    content.push(
      buildHeading({
        line: params.defaultTitle,
        level: 1,
        align: 'center',
      }),
    );
  }

  return {
    contentJSON: {
      type: 'doc',
      content,
    },
    mergeFields: params.mergeFields,
  };
};
