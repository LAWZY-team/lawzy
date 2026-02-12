import type { JSONContent } from "@tiptap/core"
import type { DocContent, ContentNode } from "@/types/template"

/** Chuyển node 'field' (template) sang 'mergeField' (TipTap); giữ marks (italic, bold) cho text */
function mapInlineNode(node: ContentNode): JSONContent | JSONContent[] | null {
  if (node.type === "text") {
    const t = node as { text?: string; marks?: { type: string }[] }
    const marks = t.marks?.length ? t.marks.map((m) => ({ type: m.type })) : undefined
    return { type: "text", text: t.text, ...(marks?.length && { marks }) }
  }
  if (node.type === "field") {
    const attrs = (node as { attrs: { fieldKey: string; label?: string } }).attrs
    return {
      type: "mergeField",
      attrs: { fieldKey: attrs.fieldKey, label: attrs.label ?? attrs.fieldKey },
    }
  }
  return null
}

/** Map một mảng content (trong paragraph hoặc heading) sang TipTap */
function mapInlineContent(nodes: ContentNode[]): JSONContent[] {
  const out: JSONContent[] = []
  for (const node of nodes) {
    const mapped = mapInlineNode(node)
    if (mapped) {
      if (Array.isArray(mapped)) out.push(...mapped)
      else out.push(mapped)
    }
  }
  return out
}

/** Map một block node template sang một hoặc nhiều node TipTap (clause thành heading + content). Giữ align/divider nếu có. */
function mapBlockNode(node: ContentNode): JSONContent[] {
  if (node.type === "heading") {
    const n = node as { attrs: { level: 1 | 2 | 3; align?: "left" | "center" }; content?: ContentNode[] }
    return [
      {
        type: "heading",
        attrs: {
          level: n.attrs.level,
          ...(n.attrs.align && { textAlign: n.attrs.align }),
        },
        content: n.content ? mapInlineContent(n.content) : [],
      },
    ]
  }
  if (node.type === "paragraph") {
    const n = node as { attrs?: { align?: "left" | "center"; divider?: boolean }; content?: ContentNode[] }
    if (n.attrs?.divider) {
      return [{ type: "paragraph", content: [{ type: "text", text: "—".repeat(20) }], attrs: { textAlign: "center" } }]
    }
    return [
      {
        type: "paragraph",
        attrs: n.attrs?.align ? { textAlign: n.attrs.align } : undefined,
        content: n.content ? mapInlineContent(n.content) : [],
      },
    ]
  }
  if (node.type === "clause") {
    const n = node as {
      attrs: { title: string };
      content?: ContentNode[];
    }
    const result: JSONContent[] = [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: n.attrs.title }],
      },
    ]
    if (n.content) {
      for (const child of n.content) {
        result.push(...mapBlockNode(child))
      }
    }
    return result
  }
  return []
}

/**
 * Chuyển template contentJSON (DocContent) sang TipTap JSONContent.
 * - field -> mergeField
 * - clause -> heading (level 2) + nội dung clause
 */
export function templateContentToEditorContent(doc: DocContent): JSONContent {
  const content: JSONContent[] = []
  if (!doc.content || !Array.isArray(doc.content)) {
    return { type: "doc", content: [] }
  }
  for (const node of doc.content) {
    content.push(...mapBlockNode(node))
  }
  return { type: "doc", content }
}
