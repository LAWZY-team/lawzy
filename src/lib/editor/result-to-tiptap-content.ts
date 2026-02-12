/**
 * Convert contract generation API result into TipTap JSON content.
 * Handles {{KEY}} -> mergeField, **...** -> bold, heading/paragraph alignment.
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
 * Convert contract_generation result to TipTap doc content.
 * Does not inject title as h1 (avoids duplicate with first section heading).
 */
export function contractResultToTipTapContent(
  result: ContractGenerationResult,
  options: ResultToTipTapOptions
): ResultToTipTapOutput {
  void options // reserved for mergeKeyToLabel/mergeFieldValues when needed
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

  for (const section of sections as Array<{ heading?: string; content?: string; mergeFields?: string[] }>) {
    if (Array.isArray(section.mergeFields)) {
      section.mergeFields.forEach((raw: string) => {
        const key = String(raw).replace(/^\{\{|\}\}$/g, '').trim()
        if (key) allMergeKeys.add(key)
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
