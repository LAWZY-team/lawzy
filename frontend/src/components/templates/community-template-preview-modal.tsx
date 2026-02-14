"use client"

import * as React from "react"
import { X, Download, Trash2, FileText } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getDownloadUrl, getPreviewUrl, type ContractTemplateFile } from "@/lib/api/contract-templates"

function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf")
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

export function CommunityTemplatePreviewModal({
  file,
  open,
  onClose,
  onDelete,
}: {
  file: ContractTemplateFile | null
  open: boolean
  onClose: () => void
  onDelete: (id: string) => void
}) {
  if (!file) return null

  const previewSupported = isPdf(file.fileName)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      title={file.fileName}
    >
      <div className="flex flex-col h-full min-h-[400px] rounded-lg border-0 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <h3 className="font-semibold truncate">{file.fileName}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(getDownloadUrl("community", file.id), "_blank")}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Tải
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(file.id)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Xóa
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 w-full">
          <div className="flex-1 min-w-[max(360px,55%)] border-r flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
              <FileText className="h-4 w-4" />
              Xem trước
            </div>
            <div className="flex-1 min-h-0">
              {previewSupported ? (
                <iframe
                  key={file.id}
                  src={getPreviewUrl("community", file.id)}
                  className="h-full w-full"
                  title={file.fileName}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                  File này chưa hỗ trợ xem trước. Vui lòng tải về để xem nội dung.
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 w-[280px] flex-col bg-muted/20 overflow-hidden">
            <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2 shrink-0">
              Thông tin file
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Loại</span>
                  <Badge variant="secondary">{previewSupported ? "PDF" : "FILE"}</Badge>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Kích thước</span>
                    <span className="font-medium">{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Cập nhật</span>
                    <span className="font-medium">
                      {file.lastModified ? new Date(file.lastModified).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </Modal>
  )
}

