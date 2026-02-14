import type { JSONContent } from '@tiptap/core'

/**
 * Chuyển nội dung editor (TipTap JSON) sang văn bản thuần để gửi cho AI làm context.
 * Giữ cấu trúc heading/paragraph; mergeField hiển thị dạng {{FIELD_KEY}}.
 */
export function editorContentToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc || !doc.content?.length) return ''

  const lines: string[] = []

  function textFromNode(node: JSONContent): string {
    if (node.type === 'text') {
      return (node as { text?: string }).text ?? ''
    }
    if (node.type === 'mergeField') {
      const key = (node as { attrs?: { fieldKey?: string; label?: string } }).attrs?.fieldKey
      return key ? `{{${key}}}` : '{{}}'
    }
    if (node.content) {
      return node.content.map((c) => textFromNode(c)).join('')
    }
    return ''
  }

  function walk(nodes: JSONContent[]) {
    for (const node of nodes) {
      if (node.type === 'heading') {
        const level = (node as { attrs?: { level?: number } }).attrs?.level ?? 1
        const prefix = level === 1 ? '#' : level === 2 ? '##' : '###'
        const text = (node.content ?? []).map((c) => textFromNode(c)).join('').trim()
        lines.push(`${prefix} ${text}`)
      } else if (node.type === 'paragraph') {
        const text = (node.content ?? []).map((c) => textFromNode(c)).join('').trim()
        lines.push(text || '')
      } else if (node.content) {
        walk(node.content as JSONContent[])
      }
    }
  }

  walk(doc.content as JSONContent[])
  return lines.join('\n').trim()
}
