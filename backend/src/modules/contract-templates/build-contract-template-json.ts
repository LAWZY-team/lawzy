import type {
  ContentBlockAlign,
  ContentClauseNode,
  ContentFieldNode,
  ContentHeadingNode,
  ContentParagraphNode,
  ContentTextNode,
  DocContent,
  MergeFieldDefinition,
  ContentBulletListNode,
  ContentListItemNode,
  ContentTableNode,
  ContentTableRowNode,
  ContentTableCellNode,
} from './contract-templates.types';

interface BuildContractTemplateJsonResult {
  contentJSON: DocContent;
  mergeFields: MergeFieldDefinition[];
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
    lower.includes('cộng hoà xã hội chủ nghĩa việt nam') ||
    lower.includes('độc lập') && lower.includes('tự do') && lower.includes('hạnh phúc')
  );
}

function isClauseHeading(line: string): boolean {
  const cleanLine = line.replace(/^#{1,6}\s+/, '').trim();
  return /^(điều|article|clause)\s+\d+[\s.:)]/i.test(cleanLine);
}

function isMarkdownTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length > 2;
}

function parseMarkdownTableLine(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, -1);
  return inner.split('|').map(c => c.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  if (!isMarkdownTableLine(line)) return false;
  const cells = parseMarkdownTableLine(line);
  return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c));
}

function parseInlineContent(
  line: string,
): Array<ContentTextNode | ContentFieldNode> {
  const content: Array<ContentTextNode | ContentFieldNode> = [];
  // Tokenize: {{FIELD}}, **bold**, __bold__
  const regex = /(\{\{[A-Z0-9_]+\}\})|(\*\*)|(__)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let isBold = false;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index);
      const node: ContentTextNode = { type: 'text', text };
      if (isBold) node.marks = [{ type: 'bold' }];
      content.push(node);
    }

    if (match[1]) {
      // {{FIELDKey}}
      const key = match[1].replace(/[\{\}]/g, '');
      const node: ContentFieldNode = {
        type: 'field',
        attrs: {
          fieldKey: key,
          label: key.replace(/_/g, ' '),
        },
      };
      content.push(node);
    } else if (match[2] || match[3]) {
      // Toggle bold
      isBold = !isBold;
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    const text = line.slice(lastIndex);
    if (text.length > 0) {
      const node: ContentTextNode = { type: 'text', text };
      if (isBold) node.marks = [{ type: 'bold' }];
      content.push(node);
    }
  }

  if (content.length === 0 && line.length > 0) {
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
  align?: ContentBlockAlign;
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

export const buildContractTemplateJson = (params: {
  text: string;
  mergeFields: MergeFieldDefinition[];
  defaultTitle: string;
}): BuildContractTemplateJsonResult => {
  const lines = splitNonEmptyLines(params.text);
  const rootContent: DocContent['content'] = [];
  
  let currentClause: ContentClauseNode | null = null;
  let clauseIndex = 1;
  let headingCount = 0;
  let listItems: ContentListItemNode[] = [];
  let currentTable: ContentTableNode | null = null;
  let currentTableColumnCount = 0;

  const flushList = (targetArr: any[]) => {
    if (listItems.length > 0) {
      targetArr.push({
        type: 'bulletList',
        content: listItems,
      });
      listItems = [];
    }
  };

  const flushTable = (targetArr: any[]) => {
    if (currentTable) {
      targetArr.push(currentTable);
      currentTable = null;
      currentTableColumnCount = 0;
    }
  };

  const padExistingTableRows = (table: ContentTableNode, targetCols: number) => {
    for (const row of table.content) {
      if (row.content.length >= targetCols) continue;
      const missing = targetCols - row.content.length;
      row.content.push(
        ...Array.from({ length: missing }, () => ({
          type: 'tableCell' as const,
          content: [buildParagraph('')],
        })),
      );
    }
  };

  const pushCurrentClause = () => {
    if (currentClause) {
      flushList(currentClause.content);
      flushTable(currentClause.content);
      rootContent.push(currentClause);
      clauseIndex += 1;
      currentClause = null;
    } else {
      flushList(rootContent);
      flushTable(rootContent);
    }
  };

  for (const rawLine of lines) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;
    
    const targetArray = currentClause ? currentClause.content : rootContent;

    if (isDividerLine(line)) {
      flushList(targetArray);
      flushTable(targetArray);
      pushCurrentClause();
      rootContent.push({
        type: 'paragraph',
        attrs: { align: 'center', divider: true },
        content: [],
      });
      continue;
    }
    
    if (isMarkdownTableLine(line)) {
      flushList(targetArray);

      if (!currentTable) {
        currentTable = { type: 'table', content: [] };
        currentTableColumnCount = 0;
      }

      if (isMarkdownTableSeparator(line)) {
        // Skip markdown separator row, but keep all cells as normal tableCell.
        continue;
      }

      const cells = parseMarkdownTableLine(line);
      if (cells.length > currentTableColumnCount) {
        currentTableColumnCount = cells.length;
        if (currentTable.content.length > 0) {
          padExistingTableRows(currentTable, currentTableColumnCount);
        }
      }
      const normalizedCells = [
        ...cells,
        ...Array.from({ length: Math.max(0, currentTableColumnCount - cells.length) }, () => ''),
      ];
      const rowNode: ContentTableRowNode = {
        type: 'tableRow',
        content: normalizedCells.map(cellText => ({
          type: 'tableCell',
          content: [buildParagraph(cellText)]
        }))
      };
      
      currentTable.content.push(rowNode);
      continue;
    } else {
      flushTable(targetArray);
    }
    
    if (isClauseHeading(line)) {
      pushCurrentClause();
      const cleanTitle = line.replace(/^#{1,6}\s+/, '').trim();
      currentClause = {
        type: 'clause',
        attrs: {
          clauseId: `clause_${clauseIndex}`,
          riskLevel: 'low',
          title: cleanTitle,
        },
        content: [],
      };
      continue;
    }

    const markdownHeadingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const isHeading = isNationalHeader(line) || isUppercaseHeading(line) || !!markdownHeadingMatch;
    
    if (isHeading) {
      flushList(targetArray);
      flushTable(targetArray);
      
      let level: 1 | 2 | 3 = 2; // Default
      let cleanTitle = line;
      let isCenter = false;

      // Handle Title / Motto properly
      if (isNationalHeader(line)) {
        level = 1;
        isCenter = true;
      } else {
        if (isUppercaseHeading(line)) {
          headingCount += 1;
          // The very first uppercase heading is usually the Document Title "HỢP ĐỒNG..."
          if (headingCount === 1) {
            level = 1;
            isCenter = true;
          } else {
            // Further uppercase headers are usually main sections
            level = 2;
          }
        }
        
        if (markdownHeadingMatch) {
          let numHash = markdownHeadingMatch[1].length;
          // Markdown # headers shouldn't override the global Title text-center unless it IS the Title.
          // By downgrading them natively to Level 2 (unless Center), we prevent the Canvas Editor's default h1 text-center CSS.
          if (numHash === 1 && !isCenter && !isUppercaseHeading(line)) {
            numHash = 2;
          }
          level = (numHash <= 3 ? numHash : 3) as 1 | 2 | 3;
          cleanTitle = markdownHeadingMatch[2];
        }
      }

      // If it's a global uppercase header, it breaks out of the clause
      if (isUppercaseHeading(line) && !isNationalHeader(line)) {
         pushCurrentClause(); 
      }

      const hNode = buildHeading({
        line: cleanTitle,
        level,
        align: isCenter ? 'center' : 'left',
      });
      
      const insertTarget = currentClause && !isUppercaseHeading(line) ? currentClause.content : rootContent;
      insertTarget.push(hNode);
      continue;
    }
    
    const matchBullet = line.match(/^[-*]+[\s-]*\s+(.*)$/);
    if (matchBullet) {
      flushTable(targetArray);
      const cleanText = matchBullet[1]; 
      listItems.push({
        type: 'listItem',
        content: [buildParagraph(cleanText)],
      });
      continue;
    }

    flushList(targetArray);
    flushTable(targetArray);
    targetArray.push(buildParagraph(line));
  }

  pushCurrentClause();

  if (rootContent.length === 0) {
    rootContent.push(
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
      content: rootContent,
    },
    mergeFields: params.mergeFields,
  };
};
