"use client"

import * as React from "react"
import Link from "next/link"
import { X, FileText, Calendar, Scale, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TemplatePreview } from "./template-preview"
import type { Template, MergeFieldDefinition } from "@/types/template"
import { formatDistanceToNow } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import { useT } from "@/components/i18n-provider"

interface TemplateDetailSplitProps {
  template: Template | null
  onClose: () => void
}

export function TemplateDetailSplit({ template, onClose }: TemplateDetailSplitProps) {
  const { t, locale } = useT()
  if (!template) return null

  const dateLocale = locale === "vi" ? vi : enUS

  const mergeFields = (template.mergeFields ?? []) as MergeFieldDefinition[]
  const laws = template.metadata?.lawVersions ?? []

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-lg border-0 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <h3 className="font-semibold truncate">{template.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/editor/new?template=${template.id}`}>{t("tmpl_use_this")}</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common_close")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex-1 min-w-[max(360px,55%)] border-r flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
            <FileText className="h-4 w-4" />
            {t("tmpl_preview")}
          </div>
          <TemplatePreview
            contentJSON={template.contentJSON ?? null}
            className="flex-1 min-w-0 w-full p-5 overflow-auto"
          />
        </div>

        <div className="flex shrink-0 w-[280px] flex-col bg-muted/20 overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
            <Layers className="h-4 w-4" />
            {t("tmpl_info")}
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{template.description}</p>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {t("tmpl_general")}
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("tmpl_type")}</span>
                    <Badge variant="secondary">{template.category}</Badge>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("tmpl_scope")}</span>
                    <Badge variant="outline" className="capitalize">{template.scope}</Badge>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("tmpl_time")}
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("tmpl_created")}</span>
                    <span>{template.createdAt ? formatDistanceToNow(new Date(template.createdAt), { addSuffix: true, locale: dateLocale }) : "—"}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("tmpl_updated")}</span>
                    <span>{template.updatedAt ? formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true, locale: dateLocale }) : "—"}</span>
                  </li>
                </ul>
              </div>

              {laws.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Scale className="h-3.5 w-3.5" />
                      {t("tmpl_source")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {laws.map((law) => (
                        <Badge key={law} variant="secondary">{law}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t("tmpl_merge_fields", { n: mergeFields.length })}
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
                    <li className="text-muted-foreground text-xs">{t("tmpl_more_fields", { n: mergeFields.length - 15 })}</li>
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
