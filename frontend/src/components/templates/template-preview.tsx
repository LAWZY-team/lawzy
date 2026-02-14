"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DocContent, ContentNode } from "@/types/template"
import { cn } from "@/lib/utils"

interface TemplatePreviewProps {
  contentJSON: DocContent | null
  className?: string
}

/** Heading classes giống văn bản hợp đồng trong canvas editor */
const headingClass: Record<number, string> = {
  1: "text-2xl font-bold mt-6 mb-4 first:mt-0 tracking-tight",
  2: "text-xl font-semibold mt-5 mb-3 tracking-tight",
  3: "text-lg font-semibold mt-4 mb-2",
}

/** Align class cho block (quốc hiệu, tiêu đề HĐ căn giữa; căn cứ/điều khoản căn trái) */
const alignClass = (align?: "left" | "center") =>
  align === "center" ? "text-center" : "text-left"

/** Render contentJSON giống format văn bản trong editor (h1, h2, h3, paragraph) + bố cục chuẩn VN */
function renderNode(node: ContentNode, index: number): React.ReactNode {
  if (!node) return null
  switch (node.type) {
    case "heading": {
      const attrs = (node as { attrs?: { level?: number; align?: "left" | "center" } }).attrs
      const level = attrs?.level ?? 1
      const text = getTextFromContent((node as { content?: ContentNode[] }).content)
      const Tag = `h${Math.min(3, Math.max(1, level))}` as 'h1' | 'h2' | 'h3'
      return (
        <Tag key={index} className={cn(headingClass[level] ?? headingClass[1], alignClass(attrs?.align))}>
          {text}
        </Tag>
      )
    }
    case "paragraph": {
      const n = node as { attrs?: { align?: "left" | "center"; divider?: boolean }; content?: ContentNode[] }
      const content = n.content ?? []
      if (n.attrs?.divider) {
        return <hr key={index} className="my-3 border-border w-24 mx-auto" aria-hidden />
      }
      const hasItalic = content.some(
        (c) => (c as { marks?: { type: string }[] }).marks?.some((m) => m.type === "italic")
      )
      return (
        <p
          key={index}
          className={cn(
            "text-sm text-muted-foreground mb-3 leading-relaxed",
            alignClass(n.attrs?.align),
            hasItalic && "italic"
          )}
        >
          {content.map((n2, i) => renderInline(n2, i))}
        </p>
      )
    }
    case "clause": {
      const attrs = (node as { attrs?: { title?: string }; content?: ContentNode[] }).attrs
      const children = (node as { content?: ContentNode[] }).content ?? []
      return (
        <div key={index} className="mt-4">
          {attrs?.title && (
            <h2 className={headingClass[2]}>{attrs.title}</h2>
          )}
          <div className="space-y-1">
            {children.map((n, i) => renderNode(n, i))}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

function renderInline(node: ContentNode, index: number): React.ReactNode {
  if (!node) return null
  if ((node as { type?: string }).type === "text") {
    return <span key={index}>{(node as { text?: string }).text ?? ""}</span>
  }
  if ((node as { type?: string }).type === "field") {
    const attrs = (node as { attrs?: { fieldKey?: string; label?: string } }).attrs
    const displayText = (attrs?.label ?? attrs?.fieldKey ?? "?").toUpperCase()
    return (
      <span key={index} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase">
        {`{{${displayText}}}`}
      </span>
    )
  }
  return null
}

function getTextFromContent(content: ContentNode[] | undefined): string {
  if (!content) return ""
  return content
    .map((n) => ((n as { text?: string }).text) ?? "")
    .filter(Boolean)
    .join("")
}

export function TemplatePreview({ contentJSON, className }: TemplatePreviewProps) {
  if (!contentJSON?.content?.length) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">Chưa có nội dung xem trước.</p>
      </div>
    )
  }

  return (
    <ScrollArea className={className}>
      <div className="prose prose-sm dark:prose-invert max-w-none min-w-0 w-full pr-4">
        {contentJSON.content.map((node, index) => renderNode(node, index))}
      </div>
    </ScrollArea>
  )
}
