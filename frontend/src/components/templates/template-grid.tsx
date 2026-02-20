"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Template } from "@/types/template"
import type { TemplateViewMode } from "./template-filters"

interface TemplateGridProps {
  templates: Template[]
  onViewTemplate: (template: Template) => void
  viewMode?: TemplateViewMode
}

export function TemplateGrid({ templates, onViewTemplate, viewMode = "card" }: TemplateGridProps) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {templates.map((template) => {
          const laws = template.metadata?.lawVersions ?? []
          return (
            <Card key={template.id} className="flex flex-row items-center gap-4 p-4 hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{template.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">{template.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{template.description}</p>
                {laws.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{laws.join(", ")}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewTemplate(template)}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  Xem
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/editor/new?template=${template.id}`}>Sử dụng</Link>
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    <p className="font-semibold mb-1">Nguồn:</p>
                    <p>{laws.join(", ")}</p>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onViewTemplate(template)}>
                <Eye className="h-4 w-4 mr-2" />
                Xem
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/editor/new?template=${template.id}`}>Sử dụng</Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
