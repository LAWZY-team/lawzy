import type { JSONContent } from '@tiptap/core'

/**
 * Convert TipTap JSON content tree to a Markdown string.
 * Handles headings, paragraphs, lists, tables, horizontal rules, merge fields,
 * and inline marks (bold, italic, underline).
 */
export const convertTipTapToMarkdown = (doc: JSONContent): string => {
  if (!doc?.content) return ''
  return doc.content.map(nodeToMarkdown).join('\n\n')
}

const nodeToMarkdown = (node: JSONContent): string => {
  switch (node.type) {
    case 'heading': {
      const level = (node.attrs?.level as number) || 1
      const prefix = '#'.repeat(Math.min(level, 6))
      return `${prefix} ${inlineToMarkdown(node.content)}`
    }

    case 'paragraph':
      return inlineToMarkdown(node.content)

    case 'horizontalRule':
      return '---'

    case 'bulletList':
      return (node.content || [])
        .filter((item) => item.type === 'listItem')
        .map((item) => listItemToMarkdown(item, '- '))
        .join('\n')

    case 'orderedList':
      return (node.content || [])
        .filter((item) => item.type === 'listItem')
        .map((item, idx) => listItemToMarkdown(item, `${idx + 1}. `))
        .join('\n')

    case 'table':
      return tableToMarkdown(node)

    case 'clause':
      return (node.content || []).map(nodeToMarkdown).join('\n\n')

    default:
      if (node.content) return inlineToMarkdown(node.content)
      return ''
  }
}

const listItemToMarkdown = (item: JSONContent, prefix: string): string => {
  const paragraphs = (item.content || [])
    .map((child) => inlineToMarkdown(child.content))
    .filter(Boolean)
  if (paragraphs.length === 0) return prefix
  return paragraphs.map((p, i) => (i === 0 ? `${prefix}${p}` : `  ${p}`)).join('\n')
}

const tableToMarkdown = (node: JSONContent): string => {
  const rows = (node.content || []).filter((r) => r.type === 'tableRow')
  if (rows.length === 0) return ''

  const mdRows = rows.map((row) =>
    (row.content || [])
      .filter((cell) => cell.type === 'tableCell' || cell.type === 'tableHeader')
      .map((cell) =>
        (cell.content || [])
          .map((child) => inlineToMarkdown(child.content))
          .join(' ')
          .replace(/\|/g, '\\|')
      )
  )

  const lines: string[] = []
  for (let i = 0; i < mdRows.length; i++) {
    lines.push(`| ${mdRows[i].join(' | ')} |`)
    if (i === 0) {
      lines.push(`| ${mdRows[i].map(() => '---').join(' | ')} |`)
    }
  }
  return lines.join('\n')
}

const inlineToMarkdown = (content?: JSONContent[]): string => {
  if (!content) return ''
  return content.map(inlineNodeToMarkdown).join('')
}

const inlineNodeToMarkdown = (node: JSONContent): string => {
  if (node.type === 'hardBreak') return '  \n'

  if (node.type === 'mergeField' || node.type === 'field') {
    const fieldKey = (node.attrs?.fieldKey as string) ?? ''
    return fieldKey ? `{{${fieldKey}}}` : ''
  }

  if (node.type === 'text') {
    let text = node.text || ''
    const marks = node.marks || []
    const isBold = marks.some((m) => m.type === 'bold')
    const isItalic = marks.some((m) => m.type === 'italic')

    if (isBold && isItalic) text = `***${text}***`
    else if (isBold) text = `**${text}**`
    else if (isItalic) text = `*${text}*`

    return text
  }

  return ''
}
