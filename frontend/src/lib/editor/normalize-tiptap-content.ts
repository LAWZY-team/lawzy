import type { JSONContent } from "@tiptap/core"

const VALID_TEXT_ALIGN = new Set(["left", "center", "right", "justify"] as const)

function sanitizeTextAlign(value: unknown): "left" | "center" | "right" | "justify" | undefined {
  if (typeof value !== "string") return undefined
  return VALID_TEXT_ALIGN.has(value as "left" | "center" | "right" | "justify")
    ? (value as "left" | "center" | "right" | "justify")
    : undefined
}

function normalizeNode(node: JSONContent): JSONContent {
  const base: JSONContent = { ...node }

  if (base.attrs && typeof base.attrs === "object" && !Array.isArray(base.attrs)) {
    const textAlign = sanitizeTextAlign((base.attrs as { textAlign?: unknown }).textAlign)
    if ((base.type === "paragraph" || base.type === "heading") && textAlign) {
      base.attrs = { ...base.attrs, textAlign }
    } else if ((base.type === "paragraph" || base.type === "heading") && "textAlign" in base.attrs) {
      const nextAttrs = { ...base.attrs }
      delete (nextAttrs as { textAlign?: unknown }).textAlign
      base.attrs = nextAttrs
    }
  }

  if (Array.isArray(base.content)) {
    base.content = base.content.map((child) => normalizeNode(child))
  }

  if ((base.type === "tableCell" || base.type === "tableHeader") && (!base.content || base.content.length === 0)) {
    base.content = [{ type: "paragraph", content: [] }]
  }

  return base
}

export function normalizeTipTapDocContent(value: unknown): JSONContent {
  if (!value || typeof value !== "object") {
    return { type: "doc", content: [] }
  }

  const asDoc = value as { type?: unknown; content?: unknown }
  if (asDoc.type !== "doc" || !Array.isArray(asDoc.content)) {
    return { type: "doc", content: [] }
  }

  return {
    type: "doc",
    content: asDoc.content.map((node) => normalizeNode(node as JSONContent)),
  }
}
