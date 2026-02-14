"use client"

import * as React from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Template as TemplateType, MergeFieldDefinition } from "@/types/template"

interface Template extends Pick<TemplateType, "templateId" | "title" | "description" | "type" | "lawVersions" | "author" | "createdAt"> {
  mergeFields?: MergeFieldDefinition[] | string[]
}

interface TemplateDetailModalProps {
  template: Template | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateDetailModal({ template, open, onOpenChange }: TemplateDetailModalProps) {
  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Thông tin</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Loại:</span>
                  <Badge variant="secondary" className="ml-2">{template.type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Tác giả:</span>
                  <span className="ml-2">{template.author}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-2">Nguồn</h4>
              <div className="flex flex-wrap gap-2">
                {template.lawVersions.map((law) => (
                  <Badge key={law}>{law}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-2">Merge Fields ({template.mergeFields?.length ?? 0})</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(template.mergeFields ?? []).slice(0, 10).map((field, i) => {
                  const key = typeof field === "string" ? field : field.fieldKey
                  const label = typeof field === "string" ? field : field.label
                  return (
                    <div key={typeof field === "string" ? field : `${field.fieldKey}-${i}`} className="flex flex-col gap-0.5">
                      <code className="px-2 py-1 bg-muted rounded text-xs">{`{{${key}}}`}</code>
                      {typeof field === "object" && label !== key && (
                        <span className="text-muted-foreground text-xs">{label}</span>
                      )}
                    </div>
                  )
                })}
                {(template.mergeFields?.length ?? 0) > 10 && (
                  <span className="text-muted-foreground text-xs col-span-2">
                    và {(template.mergeFields?.length ?? 0) - 10} field khác...
                  </span>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button asChild>
            <Link href={`/editor/new?template=${template.templateId}`}>
              Sử dụng mẫu này
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
