import {
  ContentClauseNode,
  ContentHeadingNode,
  ContentParagraphNode,
  DocContent,
} from '../contract-templates/contract-templates.types';

export function parseMarkdownToTiptap(markdownText: string): DocContent {
  const lines = markdownText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const content: any[] = [];
  
  let currentClause: { title: string; lines: string[] } | null = null;
  let clauseIndex = 1;

  const pushClause = () => {
    if (currentClause && currentClause.lines.length > 0) {
      const clauseNode: ContentClauseNode = {
        type: 'clause',
        attrs: {
          clauseId: `clause_${clauseIndex++}`,
          riskLevel: 'low',
          title: currentClause.title,
        },
        content: currentClause.lines.map((line) => ({
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [{ type: 'text', text: line }],
        })),
      };
      content.push(clauseNode);
    } else if (currentClause) {
        // empty clause just push as heading
        content.push({
            type: 'heading',
            attrs: { level: 2, align: 'left' },
            content: [{ type: 'text', text: currentClause.title }],
        });
    }
    currentClause = null;
  };

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      pushClause();
      const level = line.startsWith('### ') ? 3 : 2;
      const text = line.replace(/^#+\s*/, '');
      
      // If it looks like a Clause ("Article X", "Điều X") group into a Clause
      if (/^(điều|article|clause)\s+\d+[\s.:)]/i.test(text)) {
        currentClause = { title: text, lines: [] };
      } else {
        const headingNode: ContentHeadingNode = {
          type: 'heading',
          attrs: { level, align: 'left' },
          content: [{ type: 'text', text }],
        };
        content.push(headingNode);
      }
    } else if (line.startsWith('# ')) {
      pushClause();
      const text = line.replace(/^#\s*/, '');
      const titleNode: ContentHeadingNode = {
        type: 'heading',
        attrs: { level: 1, align: 'center' },
        content: [{ type: 'text', text }],
      };
      content.push(titleNode);
    } else if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
       // list item or bullet
       const cleanLine = line.replace(/^([-*+]|\d+\.)\s+/, '• ');
       if (currentClause) {
         currentClause.lines.push(cleanLine);
       } else {
         content.push({
           type: 'paragraph',
           attrs: { align: 'left' },
           content: [{ type: 'text', text: cleanLine }],
         });
       }
    } else {
      if (currentClause) {
        currentClause.lines.push(line);
      } else {
        content.push({
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [{ type: 'text', text: line }],
        });
      }
    }
  }

  pushClause();

  return {
    type: 'doc',
    content,
  };
}
