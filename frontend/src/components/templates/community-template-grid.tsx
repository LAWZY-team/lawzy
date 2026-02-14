"use client"

import * as React from "react"
import { Eye, FileText, Download, Trash2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContractTemplateFile } from "@/lib/api/contract-templates"
import type { TemplateViewMode } from "./template-filters"

function fileExt(name: string): string {
  const idx = name.lastIndexOf(".")
  return idx >= 0 ? name.slice(idx + 1).toUpperCase() : "FILE"
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

export function CommunityTemplateGrid({
  files,
  onView,
  onDownload,
  onDelete,
  viewMode = "card",
}: {
  files: ContractTemplateFile[]
  onView: (f: ContractTemplateFile) => void
  onDownload: (f: ContractTemplateFile) => void
  onDelete: (f: ContractTemplateFile) => void
  viewMode?: TemplateViewMode
}) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <Card
            key={f.key}
            className="flex flex-row items-center gap-4 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold truncate">{(f.name ?? f.fileName) || f.fileName}</span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {fileExt(f.fileName)}
                </Badge>
              </div>
              {f.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">{f.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(f.size)} • {f.lastModified ? new Date(f.lastModified).toLocaleString() : "—"}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => onView(f)}>
                <Eye className="h-4 w-4 mr-1.5" />
                Xem
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDownload(f)}>
                <Download className="h-4 w-4 mr-1.5" />
                Tải
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(f)}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Xóa
              </Button>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {files.map((f) => (
        <Card key={f.key} className="flex flex-col hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <Badge variant="secondary">{fileExt(f.fileName)}</Badge>
            </div>
            <CardTitle className="line-clamp-2 break-all">
              {(f.name ?? f.fileName) || f.fileName}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="space-y-2">
              {f.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{f.description}</p>
              )}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <span>Kích thước</span>
                  <span className="font-medium text-foreground">{formatBytes(f.size)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Cập nhật</span>
                  <span className="font-medium text-foreground">
                    {f.lastModified ? new Date(f.lastModified).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onView(f)}>
              <Eye className="h-4 w-4 mr-2" />
              Xem
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onDownload(f)}>
              <Download className="h-4 w-4 mr-2" />
              Tải
            </Button>
            <Button variant="destructive" size="icon" onClick={() => onDelete(f)} aria-label="Xóa">
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

