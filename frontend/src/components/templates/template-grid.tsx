"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Template } from "@/types/template"
import type { TemplateViewMode } from "./template-filters"
import { useT } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

interface TemplateGridProps {
  templates: Template[]
  onViewTemplate: (template: Template) => void
  viewMode?: TemplateViewMode
  onUseTemplate?: (template: Template) => void
  showUseAction?: boolean
  compact?: boolean
}

export function TemplateGrid({
  templates,
  onViewTemplate,
  viewMode = "card",
  onUseTemplate,
  showUseAction = true,
  compact = false,
}: TemplateGridProps) {
  const { t } = useT()

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {templates.map((template) => {
          const laws = template.metadata?.lawVersions ?? []
          return (
            <Card
              key={template.id}
              className={cn(
                "hover:shadow-md transition-shadow",
                compact
                  ? "flex flex-col gap-3 p-3"
                  : "flex flex-row items-center gap-4 p-4",
              )}
            >
              <div className={cn(
                "flex shrink-0 items-center justify-center rounded-lg bg-primary/10",
                compact ? "h-10 w-10" : "h-12 w-12",
              )}>
                <FileText className={cn("text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="font-semibold truncate">{template.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">{template.category}</Badge>
                </div>
                <p className={cn("text-muted-foreground mt-0.5", compact ? "text-xs line-clamp-2" : "text-sm truncate")}>
                  {template.description}
                </p>
                {laws.length > 0 && (
                  <p className={cn("text-xs text-muted-foreground mt-1", compact && "line-clamp-2")}>{laws.join(", ")}</p>
                )}
              </div>
              <div className={cn("flex shrink-0 gap-2", compact && "w-full")}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(compact && "flex-1")}
                  onClick={() => onViewTemplate(template)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  {t("tmpl_view")}
                </Button>
                {showUseAction && (
                  onUseTemplate ? (
                    <Button size="sm" className={cn(compact && "flex-1")} onClick={() => onUseTemplate(template)}>
                      {t("tmpl_use")}
                    </Button>
                  ) : (
                    <Button size="sm" className={cn(compact && "flex-1")} asChild>
                      <Link href={`/editor/new?template=${template.id}`}>{t("tmpl_use")}</Link>
                    </Button>
                  )
                )}
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", compact && "grid-cols-1 gap-3")}>
      {templates.map((template) => {
        const laws = template.metadata?.lawVersions ?? []
        return (
          <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-primary mb-2" />
                <Badge variant="secondary">{template.category}</Badge>
              </div>
              <CardTitle className="line-clamp-2">{template.title}</CardTitle>
              <CardDescription className="line-clamp-3">{template.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="space-y-3">
                {laws.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">{t("tmpl_source")}:</p>
                    <p>{laws.join(", ")}</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onViewTemplate(template)}>
                <Eye className="h-4 w-4 mr-2" />
                {t("tmpl_view")}
              </Button>
              {showUseAction && (
                onUseTemplate ? (
                  <Button className="flex-1" onClick={() => onUseTemplate(template)}>
                    {t("tmpl_use")}
                  </Button>
                ) : (
                  <Button asChild className="flex-1">
                    <Link href={`/editor/new?template=${template.id}`}>{t("tmpl_use")}</Link>
                  </Button>
                )
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
