/**
 * Convert contract generation API result into TipTap JSON content.
 * Supports two formats:
 *   1. New markdown format: result.content.markdown -> parse via @tiptap/markdown
 *   2. Legacy JSON format: result.content.sections[] -> custom mapping
 * Both handle {{KEY}} -> mergeField nodes and **...** -> bold marks.
 */
import type { JSONContent } from '@tiptap/core'
import type { ContractGenerationResult } from './contract-result'

type InlineText = { type: 'text'; text: string; marks?: { type: 'bold' }[] }
type InlineMerge = { type: 'mergeField'; attrs: { fieldKey: string } }
type InlineHardBreak = { type: 'hardBreak' }

function textToInlineWithBold(str: string): InlineText[] {
  const parts = str.split(/\*\*(.+?)\*\*/g)
  if (parts.length <= 1) return str ? [{ type: 'text', text: str }] : []
  const nodes: InlineText[] = []
  parts.forEach((s, i) => {
    if (s) nodes.push({ type: 'text', text: s, ...(i % 2 === 1 ? { marks: [{ type: 'bold' }] } : {}) })
  })
  return nodes.length ? nodes : (str ? [{ type: 'text', text: str }] : [])
}

function inlineContentFromString(
  text: string,
  allMergeKeys: Set<string>
): Array<InlineText | InlineMerge> {
  const nodes: Array<InlineText | InlineMerge> = []
  const re = /\{\{([^}]+)\}\}/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(...textToInlineWithBold(text.slice(lastIndex, m.index)))
    const key = m[1].trim()
    if (key) {
      allMergeKeys.add(key)
      nodes.push({ type: 'mergeField', attrs: { fieldKey: key } })
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) nodes.push(...textToInlineWithBold(text.slice(lastIndex)))
  return nodes.length ? nodes : (text ? textToInlineWithBold(text) : [{ type: 'text', text: '' }])
}

function headingToContent(
  heading: string,
  allMergeKeys: Set<string>
): Array<InlineText | InlineMerge | InlineHardBreak> {
  const lines = heading.split('\n')
  const result: Array<InlineText | InlineMerge | InlineHardBreak> = []
  lines.forEach((line, i) => {
    if (i > 0) result.push({ type: 'hardBreak' })
    if (line) result.push(...inlineContentFromString(line, allMergeKeys))
  })
  return result.length ? result : [{ type: 'text', text: heading }]
}

export interface ResultToTipTapOptions {
  mergeKeyToLabel: (key: string) => string
  mergeFieldValues: Record<string, string>
}

export interface ResultToTipTapOutput {
  content: JSONContent
  allMergeKeys: Set<string>
}

/**
 * Replace {{KEY}} text nodes inside a TipTap JSONContent tree with mergeField nodes.
 * Recursively walks the document tree.
 */
function replaceMergeFieldsInJsonContent(
  node: JSONContent,
  allMergeKeys: Set<string>,
): JSONContent {
  if (!node.content || !Array.isArray(node.content)) return node

  const newContent: JSONContent[] = []
  for (const child of node.content) {
    if (child.type === 'text' && typeof child.text === 'string' && child.text.includes('{{')) {
      const inlineNodes = inlineContentFromString(child.text, allMergeKeys)
      for (const inline of inlineNodes) {
        if (inline.type === 'mergeField') {
          newContent.push(inline as JSONContent)
        } else {
          newContent.push({
            ...inline,
            marks: [...(child.marks || []), ...(inline.marks || [])],
          } as JSONContent)
        }
      }
    } else {
      newContent.push(replaceMergeFieldsInJsonContent(child, allMergeKeys))
    }
  }

  return { ...node, content: newContent }
}

/**
 * Parse markdown string into TipTap JSONContent.
 * Uses a lightweight approach: convert markdown to HTML, then create TipTap-compatible JSON.
 * Falls back to simple paragraph splitting if editor instance not available.
 */
function parseMarkdownToTipTap(markdown: string): JSONContent {
  const lines = markdown.split('\n')
  const content: JSONContent[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: textToInlineWithBold(line.slice(2).trim()) as JSONContent[],
      })
    } else if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: textToInlineWithBold(line.slice(3).trim()) as JSONContent[],
      })
    } else if (line.startsWith('### ')) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: textToInlineWithBold(line.slice(4).trim()) as JSONContent[],
      })
    } else if (line.trim() === '---' || line.trim() === '***') {
      content.push({ type: 'horizontalRule' })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: JSONContent[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: textToInlineWithBold(lines[i].slice(2).trim()) as JSONContent[],
          }],
        })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    } else if (/^\d+\.\s/.test(line)) {
      const items: JSONContent[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, '').trim()
        items.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: textToInlineWithBold(text) as JSONContent[],
          }],
        })
        i++
      }
      content.push({ type: 'orderedList', content: items })
      continue
    } else if (line.startsWith('|') && line.includes('|')) {
      const tableRows: JSONContent[] = []
      let isFirstRow = true
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').filter((c) => c.trim() !== '')
        if (cells.every((c) => /^[\s-:]+$/.test(c))) {
          i++
          continue
        }
        tableRows.push({
          type: 'tableRow',
          content: cells.map((cell) => ({
            type: isFirstRow ? 'tableHeader' : 'tableCell',
            content: [{
              type: 'paragraph',
              content: textToInlineWithBold(cell.trim()) as JSONContent[],
            }],
          })),
        })
        isFirstRow = false
        i++
      }
      if (tableRows.length > 0) {
        content.push({ type: 'table', content: tableRows })
      }
      continue
    } else if (line.trim() === '') {
      content.push({ type: 'paragraph' })
    } else {
      content.push({
        type: 'paragraph',
        content: textToInlineWithBold(line) as JSONContent[],
      })
    }
    i++
  }

  return { type: 'doc', content }
}

/**
 * Convert contract_generation result to TipTap doc content.
 * Supports both markdown-first and legacy section-based formats.
 */
export function contractResultToTipTapContent(
  result: ContractGenerationResult,
  options: ResultToTipTapOptions
): ResultToTipTapOutput {
  void options
  const allMergeKeys = new Set<string>()

  const contentObj = result.content as Record<string, unknown>

  if (typeof contentObj?.markdown === 'string' && contentObj.markdown.trim()) {
    const markdownStr = contentObj.markdown as string
    let tiptapJson = parseMarkdownToTipTap(markdownStr)
    tiptapJson = replaceMergeFieldsInJsonContent(tiptapJson, allMergeKeys)

    const mergeFields = contentObj.mergeFields as Array<{ key?: string }> | undefined
    if (Array.isArray(mergeFields)) {
      mergeFields.forEach((mf) => {
        if (mf.key) allMergeKeys.add(mf.key)
      })
    }

    return { content: tiptapJson, allMergeKeys }
  }

  return contractResultToTipTapContentLegacy(result, options)
}

/**
 * Legacy converter for section-based JSON format.
 */
function contractResultToTipTapContentLegacy(
  result: ContractGenerationResult,
  options: ResultToTipTapOptions
): ResultToTipTapOutput {
  void options
  const allMergeKeys = new Set<string>()
  let sectionHeadingIndex = 0
  const newContent: JSONContent = {
    type: 'doc',
    content: [],
  }

  const sections = result.content?.sections
  if (!sections || !Array.isArray(sections)) {
    return { content: newContent, allMergeKeys }
  }

  const modifiedIndices = new Set((result.metadata?.modifiedSectionIndices ?? []) as number[])

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx] as { heading?: string; content?: string; mergeFields?: string[] }
    if (Array.isArray(section.mergeFields)) {
      section.mergeFields.forEach((raw: string) => {
        const key = String(raw).replace(/^\{\{|\}\}$/g, '').trim()
        if (key) allMergeKeys.add(key)
      })
    }
    if (modifiedIndices.has(idx) && section.heading) {
      newContent.content?.push({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [
          { type: 'text', text: '✏️ Đã cập nhật theo yêu cầu', marks: [{ type: 'italic' }] },
        ],
      })
    }
    if (section.heading) {
      const isHeaderBlock = sectionHeadingIndex < 3
      newContent.content?.push({
        type: 'heading',
        attrs: { level: 2, ...(isHeaderBlock ? { textAlign: 'center' as const } : {}) },
        content: headingToContent(section.heading, allMergeKeys),
      })
      sectionHeadingIndex++
    }
    if (section.content) {
      const paragraphs = section.content.split('\n')
      for (const p of paragraphs) {
        if (p.trim() === '') {
          newContent.content?.push({ type: 'paragraph' })
        } else {
          newContent.content?.push({
            type: 'paragraph',
            attrs: { textAlign: 'left' },
            content: inlineContentFromString(p, allMergeKeys),
          })
        }
      }
    }
  }

  return { content: newContent, allMergeKeys }
}
