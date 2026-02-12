"use client"

import * as React from "react"
import Link from "next/link"
import { X, FileText, User, Calendar, Scale, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TemplatePreview } from "./template-preview"
import type { Template, MergeFieldDefinition } from "@/types/template"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

interface TemplateDetailSplitProps {
  template: Template | null
  onClose: () => void
}

export function TemplateDetailSplit({ template, onClose }: TemplateDetailSplitProps) {
  if (!template) return null

  const mergeFields = (template.mergeFields ?? []) as MergeFieldDefinition[]

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-lg border-0 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <h3 className="font-semibold truncate">{template.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/editor/new?template=${template.templateId}`}>Sử dụng mẫu</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        {/* Left: Xem trước — tối thiểu 55% hoặc 360px */}
        <div className="flex-1 min-w-[max(360px,55%)] border-r flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
            <FileText className="h-4 w-4" />
            Xem trước nội dung
          </div>
          <TemplatePreview
            contentJSON={template.contentJSON ?? null}
            className="flex-1 min-w-0 w-full p-5 overflow-auto"
          />
        </div>

        {/* Right: Metadata — cố định 280px */}
        <div className="flex shrink-0 w-[280px] flex-col bg-muted/20 overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
            <Layers className="h-4 w-4" />
            Thông tin mẫu
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Thông tin chung
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Loại</span>
                    <Badge variant="secondary">{template.type}</Badge>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <Badge variant="outline" className="capitalize">{template.status}</Badge>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Tác giả
                </h4>
                <p className="text-sm">{template.author}</p>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Thời gian
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tạo</span>
                    <span>{template.createdAt ? formatDistanceToNow(new Date(template.createdAt), { addSuffix: true, locale: vi }) : "—"}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Cập nhật</span>
                    <span>{template.updatedAt ? formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true, locale: vi }) : "—"}</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5" />
                  Nguồn
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {template.primaryLaw && (
                    <Badge>{template.primaryLaw}</Badge>
                  )}
                  {(template.secondaryLaw ?? []).map((law) => (
                    <Badge key={law} variant="secondary">{law}</Badge>
                  ))}
                  {(template.lawVersions ?? []).filter((l) => l !== template.primaryLaw && !(template.secondaryLaw ?? []).includes(l)).map((law) => (
                    <Badge key={law} variant="outline">{law}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Trường trộn ({mergeFields.length})
                </h4>
                <ul className="space-y-2 text-sm">
                  {mergeFields.slice(0, 15).map((field) => (
                    <li key={field.fieldKey} className="flex flex-col gap-0.5">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{`{{${field.fieldKey}}}`}</code>
                      <span className="text-muted-foreground text-xs">
                        {field.label}
                        {field.required && " *"}
                        {field.sampleValue && ` — ${field.sampleValue}`}
                      </span>
                    </li>
                  ))}
                  {mergeFields.length > 15 && (
                    <li className="text-muted-foreground text-xs">+ {mergeFields.length - 15} trường khác</li>
                  )}
                </ul>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
