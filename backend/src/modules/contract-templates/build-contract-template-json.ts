import type {
  ContentClauseNode,
  ContentFieldNode,
  ContentHeadingNode,
  ContentParagraphNode,
  ContentTextNode,
  DocContent,
  MergeFieldDefinition,
  ContentBulletListNode,
  ContentListItemNode,
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
    const node: ContentTextNode = { type: 'text', text };
    if (isBold) node.marks = [{ type: 'bold' }];
    content.push(node);
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

  const flushList = (targetArr: any[]) => {
    if (listItems.length > 0) {
      targetArr.push({
        type: 'bulletList',
        content: listItems,
      });
      listItems = [];
    }
  };

  const pushCurrentClause = () => {
    if (currentClause) {
      flushList(currentClause.content);
      rootContent.push(currentClause);
      clauseIndex += 1;
      currentClause = null;
    } else {
      flushList(rootContent);
    }
  };

  for (const rawLine of lines) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;
    
    const targetArray = currentClause ? currentClause.content : rootContent;

    if (isDividerLine(line)) {
      flushList(targetArray);
      pushCurrentClause();
      rootContent.push({
        type: 'paragraph',
        attrs: { align: 'center', divider: true },
        content: [],
      });
      continue;
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
      
      // If it's a global uppercase header, it breaks out of the clause
      if (!markdownHeadingMatch && isUppercaseHeading(line)) {
         pushCurrentClause(); 
      }

      headingCount += 1;
      let level: 1 | 2 | 3 = headingCount === 1 ? 1 : headingCount <= 3 ? 2 : 3;
      let cleanTitle = line;
      
      if (markdownHeadingMatch) {
        level = (markdownHeadingMatch[1].length <= 3 ? markdownHeadingMatch[1].length : 3) as 1 | 2 | 3;
        cleanTitle = markdownHeadingMatch[2];
      }

      const hNode = buildHeading({
        line: cleanTitle,
        level,
        align: level === 1 ? 'center' : 'left',
      });
      
      const insertTarget = currentClause && !isUppercaseHeading(line) ? currentClause.content : rootContent;
      insertTarget.push(hNode);
      continue;
    }
    
    const matchBullet = line.match(/^[-*]+[\s-]*\s+(.*)$/);
    if (matchBullet) {
      const cleanText = matchBullet[1]; 
      listItems.push({
        type: 'listItem',
        content: [buildParagraph(cleanText)],
      });
      continue;
    }

    flushList(targetArray);
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
