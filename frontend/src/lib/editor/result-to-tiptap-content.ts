/**
 * Convert contract generation API result into TipTap JSON content.
 * Supports two formats:
 *   1. New markdown format: result.content.markdown -> parse via marked + generateJSON
 *   2. Legacy JSON format: result.content.sections[] -> custom mapping
 * Both handle {{KEY}} -> mergeField nodes and **...** -> bold marks.
 */
import type { JSONContent } from '@tiptap/core'
import { marked } from 'marked'
import { generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { MergeFieldExtension } from '@/lib/tiptap/extensions/merge-field'
import type { ContractGenerationResult } from './contract-result'

// Note: Ensure extensions match the main editor schema
const getExtensions = () => [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Table,
  TableRow,
  TableCell,
  TableHeader,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Underline,
  MergeFieldExtension,
]

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
 * Also handles auto-centering for National Motto ("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
 */
function replaceMergeFieldsInJsonContent(
  node: JSONContent,
  allMergeKeys: Set<string>,
): JSONContent {
  if (!node.content || !Array.isArray(node.content)) return node

  const newContent: JSONContent[] = []
  let shouldCenter = false

  for (const child of node.content) {
    if (child.type === 'text' && typeof child.text === 'string') {
      const text = child.text
      if (
        text.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') ||
        text.includes('Độc lập - Tự do')
      ) {
        shouldCenter = true
      }

      if (text.includes('{{')) {
        const inlineNodes = inlineContentFromString(text, allMergeKeys)
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
        newContent.push(child)
      }
    } else {
      newContent.push(replaceMergeFieldsInJsonContent(child, allMergeKeys))
    }
  }

  const resultNode = { ...node, content: newContent }
  if (shouldCenter && (resultNode.type === 'paragraph' || resultNode.type === 'heading')) {
    resultNode.attrs = { ...(resultNode.attrs || {}), textAlign: 'center' }
  }

  return resultNode
}

/**
 * Parse markdown string into TipTap JSONContent.
 * Uses marked to generate HTML, then generateJSON from @tiptap/html.
 */
function parseMarkdownToTipTap(markdown: string): JSONContent {
  // Use marked to convert markdown to HTML string
  const html = marked.parse(markdown, { async: false }) as string
  
  // Convert HTML to TipTap JSON structure using its core extensions
  const json = generateJSON(html, getExtensions())
  
  return json
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
    
    let shouldCenterHeading = sectionHeadingIndex < 3
    if (section.heading && (section.heading.includes('CỘNG HÒA') || section.heading.includes('Độc lập'))) {
      shouldCenterHeading = true
    }

    if (section.heading) {
      newContent.content?.push({
        type: 'heading',
        attrs: { level: 2, ...(shouldCenterHeading ? { textAlign: 'center' as const } : {}) },
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
          const isMotto = p.includes('CỘNG HÒA') || p.includes('Độc lập')
          newContent.content?.push({
            type: 'paragraph',
            attrs: { textAlign: isMotto ? 'center' : 'left' },
            content: inlineContentFromString(p, allMergeKeys),
          })
        }
      }
    }
  }

  return { content: newContent, allMergeKeys }
}
