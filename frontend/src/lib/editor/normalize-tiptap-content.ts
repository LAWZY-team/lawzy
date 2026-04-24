import type { JSONContent } from "@tiptap/core"

const VALID_TEXT_ALIGN = new Set(["left", "center", "right", "justify"] as const)

function sanitizeTextAlign(value: unknown): "left" | "center" | "right" | "justify" | undefined {
  if (typeof value !== "string") return undefined
  return VALID_TEXT_ALIGN.has(value as "left" | "center" | "right" | "justify")
    ? (value as "left" | "center" | "right" | "justify")
    : undefined
}

function toPlainText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const asNode = node as JSONContent
  if (asNode.type === "text" && typeof asNode.text === "string") return asNode.text
  if (!Array.isArray(asNode.content)) return ""
  return asNode.content.map((child) => toPlainText(child)).join(" ").replace(/\s+/g, " ").trim()
}

function tableToParagraph(node: JSONContent): JSONContent {
  const text = toPlainText(node)
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  }
}

function isTableCellType(type: unknown): type is "tableCell" | "tableHeader" {
  return type === "tableCell" || type === "tableHeader"
}

function getCellSpan(cell: JSONContent): number {
  if (!cell.attrs || typeof cell.attrs !== "object" || Array.isArray(cell.attrs)) return 1
  const raw = (cell.attrs as { colspan?: unknown }).colspan
  return typeof raw === "number" && Number.isFinite(raw) && raw > 1 ? Math.floor(raw) : 1
}

function isBlockType(type: unknown): boolean {
  return (
    type === "paragraph" ||
    type === "heading" ||
    type === "bulletList" ||
    type === "orderedList" ||
    type === "blockquote" ||
    type === "codeBlock" ||
    type === "horizontalRule" ||
    type === "table"
  )
}

function normalizeNode(node: unknown): JSONContent {
  if (!node || typeof node !== "object") return { type: "paragraph", content: [] }
  const asNode = node as JSONContent
  const base: JSONContent = { ...asNode }
  if (!base.type) return { type: "paragraph", content: [] }

  if (base.attrs && typeof base.attrs === "object" && !Array.isArray(base.attrs)) {
    const attrs = base.attrs as { textAlign?: unknown; align?: unknown }
    const textAlign = sanitizeTextAlign(attrs.textAlign)
    const legacyAlign = sanitizeTextAlign(attrs.align)
    const effectiveAlign = textAlign ?? legacyAlign
    if ((base.type === "paragraph" || base.type === "heading") && textAlign) {
      base.attrs = { ...base.attrs, textAlign }
    } else if ((base.type === "paragraph" || base.type === "heading") && effectiveAlign) {
      const nextAttrs = { ...base.attrs, textAlign: effectiveAlign }
      delete (nextAttrs as { align?: unknown }).align
      base.attrs = nextAttrs
    } else if ((base.type === "paragraph" || base.type === "heading") && "textAlign" in base.attrs) {
      const nextAttrs = { ...base.attrs }
      delete (nextAttrs as { textAlign?: unknown }).textAlign
      base.attrs = nextAttrs
    }
  }

  if (Array.isArray(base.content)) {
    base.content = base.content
      .map((child) => normalizeNode(child))
      .filter((child) => !(child.type === "text" && (typeof child.text !== "string" || child.text.length === 0)))
  }

  if (base.type === "table") {
    if (!Array.isArray(base.content) || base.content.length === 0) return tableToParagraph(base)
    const rows = base.content.filter(
      (row) => !!row && typeof row === "object" && (row as { type?: unknown }).type === "tableRow" && Array.isArray((row as JSONContent).content),
    )
    if (rows.length === 0) return tableToParagraph(base)
    const normalizedRows = rows.map((row) => {
      const cells = (row.content ?? []).filter(
        (cell) => !!cell && typeof cell === "object" && isTableCellType((cell as { type?: unknown }).type),
      )
      if (cells.length === 0) {
        return {
          type: "tableRow",
          content: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }],
        } satisfies JSONContent
      }
      return {
        type: "tableRow",
        content: cells.map((cell) => {
          const normalizedCell = normalizeNode(cell)
          if (normalizedCell.type === "tableHeader") {
            normalizedCell.type = "tableCell"
          }
          if (!Array.isArray(normalizedCell.content) || normalizedCell.content.length === 0) {
            normalizedCell.content = [{ type: "paragraph", content: [] }]
          }
          return normalizedCell
        }),
      } satisfies JSONContent
    })
    const maxColumns = normalizedRows.reduce((max, row) => {
      const rowCols = (row.content ?? []).reduce((sum, cell) => sum + getCellSpan(cell), 0)
      return Math.max(max, rowCols)
    }, 0)

    base.content = normalizedRows.map((row) => {
      const rowCols = (row.content ?? []).reduce((sum, cell) => sum + getCellSpan(cell), 0)
      if (maxColumns <= 0 || rowCols >= maxColumns) return row
      const missing = maxColumns - rowCols
      return {
        ...row,
        content: [
          ...(row.content ?? []),
          ...Array.from({ length: missing }, () => ({
            type: "tableCell",
            content: [{ type: "paragraph", content: [] }],
          })),
        ],
      }
    })
  }

  if (base.type === "tableRow") {
    if (!Array.isArray(base.content)) {
      return {
        type: "tableRow",
        content: [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }],
      }
    }
    const cells = base.content.filter(
      (cell) => !!cell && typeof cell === "object" && isTableCellType((cell as { type?: unknown }).type),
    )
    base.content =
      cells.length > 0
        ? cells.map((cell) => {
            const normalizedCell = normalizeNode(cell)
            if (normalizedCell.type === "tableHeader") {
              normalizedCell.type = "tableCell"
            }
            return normalizedCell
          })
        : [{ type: "tableCell", content: [{ type: "paragraph", content: [] }] }]
  }

  if ((base.type === "tableCell" || base.type === "tableHeader") && (!base.content || base.content.length === 0)) {
    base.content = [{ type: "paragraph", content: [] }]
  }

  if ((base.type === "tableCell" || base.type === "tableHeader") && Array.isArray(base.content)) {
    const blockChildren = base.content
      .filter((child) => !!child && typeof child === "object" && isBlockType((child as { type?: unknown }).type))
      .map((child) => normalizeNode(child))
    base.content = blockChildren.length > 0 ? blockChildren : [{ type: "paragraph", content: [] }]
  }

  return base
}

export function normalizeTipTapDocContent(value: unknown): JSONContent {
  try {
    if (!value || typeof value !== "object") {
      return { type: "doc", content: [] }
    }

    const asDoc = value as { type?: unknown; content?: unknown }
    if (asDoc.type !== "doc" || !Array.isArray(asDoc.content)) {
      return { type: "doc", content: [] }
    }

    return {
      type: "doc",
      content: asDoc.content
        .filter((node) => !!node)
        .map((node) => normalizeNode(node)),
    }
  } catch {
    return { type: "doc", content: [] }
  }
}
