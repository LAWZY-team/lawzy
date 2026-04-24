import type { JSONContent } from "@tiptap/core"
import type { DocContent, ContentNode } from "@/types/template"
import { normalizeTipTapDocContent } from "@/lib/editor/normalize-tiptap-content"

const VALID_TEXT_ALIGN = new Set(["left", "center", "right", "justify"] as const)

function toTextAlign(value: unknown): "left" | "center" | "right" | "justify" | undefined {
  if (typeof value !== "string") return undefined
  return VALID_TEXT_ALIGN.has(value as "left" | "center" | "right" | "justify")
    ? (value as "left" | "center" | "right" | "justify")
    : undefined
}

/** Chuyển node 'field' (template) sang 'mergeField' (TipTap); giữ marks (italic, bold) cho text */
function mapInlineNode(node: ContentNode): JSONContent | JSONContent[] | null {
  if (node.type === "text") {
    const t = node as { text?: string; marks?: { type: string }[] }
    if (typeof t.text !== "string" || t.text.length === 0) return null
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

function ensureParagraphCellContent(content?: ContentNode[]): JSONContent[] {
  const mapped = content ? content.flatMap(mapBlockNode) : []
  if (mapped.length > 0) return mapped
  return [{ type: "paragraph", content: [] }]
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; text?: string; content?: unknown[]; attrs?: { title?: string } }
  if (n.type === "text" && typeof n.text === "string") return n.text
  const titlePart = typeof n.attrs?.title === "string" ? n.attrs.title : ""
  const childPart = Array.isArray(n.content) ? n.content.map((child) => collectText(child)).join(" ") : ""
  return `${titlePart} ${childPart}`.replace(/\s+/g, " ").trim()
}

/** Map một block node template sang một hoặc nhiều node TipTap (clause thành heading + content). Giữ align/divider nếu có. */
function mapBlockNode(node: ContentNode): JSONContent[] {
  if (node.type === "heading") {
    const n = node as { attrs: { level: 1 | 2 | 3; align?: "left" | "center" | "right" | "justify" }; content?: ContentNode[] }
    const textAlign = toTextAlign(n.attrs.align)
    return [
      {
        type: "heading",
        attrs: {
          level: n.attrs.level,
          ...(textAlign && { textAlign }),
        },
        content: n.content ? mapInlineContent(n.content) : [],
      },
    ]
  }
  if (node.type === "paragraph") {
    const n = node as { attrs?: { align?: "left" | "center" | "right" | "justify"; divider?: boolean }; content?: ContentNode[] }
    if (n.attrs?.divider) {
      return [{ type: "paragraph", content: [{ type: "text", text: "—".repeat(20) }], attrs: { textAlign: "center" } }]
    }
    const textAlign = toTextAlign(n.attrs?.align)
    return [
      {
        type: "paragraph",
        attrs: textAlign ? { textAlign } : undefined,
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
  if (node.type === "bulletList") {
    const n = node as { content?: ContentNode[] }
    return [
      {
        type: "bulletList",
        content: n.content ? n.content.flatMap(mapBlockNode) : [],
      },
    ]
  }
  if (node.type === "listItem") {
    const n = node as { content?: ContentNode[] }
    return [
      {
        type: "listItem",
        content: n.content ? n.content.flatMap(mapBlockNode) : [],
      },
    ]
  }
  if (node.type === "table") {
    const n = node as { content?: ContentNode[] }
    const mappedRows = n.content ? n.content.flatMap(mapBlockNode) : []
    const normalizedRows = mappedRows
      .filter((row) => row?.type === "tableRow")
      .map((row) => ({
        type: "tableRow",
        content:
          Array.isArray(row.content) && row.content.length > 0
            ? row.content.filter((cell) => cell?.type === "tableCell" || cell?.type === "tableHeader")
            : [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }],
      }))

    return [
      {
        type: "table",
        content:
          normalizedRows.length > 0
            ? normalizedRows
            : [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }] }],
      },
    ]
  }
  if (node.type === "tableRow") {
    const n = node as { content?: ContentNode[] }
    return [
      {
        type: "tableRow",
        content: n.content ? n.content.flatMap(mapBlockNode) : [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }],
      },
    ]
  }
  if (node.type === "tableCell" || node.type === "tableHeader") {
    const n = node as {
      type: "tableCell" | "tableHeader"
      attrs?: { colspan?: number; rowspan?: number; colwidth?: number[] }
      content?: ContentNode[]
    }
    return [
      {
        type: n.type,
        ...(n.attrs ? { attrs: n.attrs } : {}),
        content: ensureParagraphCellContent(n.content),
      },
    ]
  }
  const fallbackText = collectText(node)
  return [
    {
      type: "paragraph",
      content: fallbackText ? [{ type: "text", text: fallbackText }] : [],
    },
  ]
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
  if (content.length === 0 && Array.isArray(doc.content) && doc.content.length > 0) {
    // Fallback for legacy/unknown template schema: try direct tiptap normalization.
    return normalizeTipTapDocContent(doc as unknown)
  }
  return { type: "doc", content }
}
