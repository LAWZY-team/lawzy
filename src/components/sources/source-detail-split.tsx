"use client"

import * as React from "react"
import { X, FileText, Calendar, Tag, Layers, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { UploadSource } from "@/types/upload-source"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  error: "Lỗi",
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SourceDetailSplitProps {
  source: UploadSource | null
  onClose: () => void
}

export function SourceDetailSplit({ source, onClose }: SourceDetailSplitProps) {
  if (!source) return null

  const hasPreview = source.status === "ready" && source.previewText && source.previewText.length > 0

  return (
    <div className="flex flex-col h-full min-h-[400px] rounded-lg border-0 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <h3 className="font-semibold truncate">{source.title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: Preview — nội dung đã extract */}
        <div className="flex-1 min-w-0 border-r flex flex-col">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Xem trước nội dung
          </div>
          <ScrollArea className="flex-1">
            <div className="p-5">
              {hasPreview ? (
                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {source.previewText}
                </pre>
              ) : source.status === "processing" || source.status === "pending" ? (
                <p className="text-muted-foreground text-sm">
                  Đang xử lý file… Nội dung xem trước sẽ hiển thị khi hoàn tất.
                </p>
              ) : source.status === "error" ? (
                <p className="text-destructive text-sm">
                  {source.errorMessage ?? "Có lỗi khi xử lý file. Bạn có thể xóa và tải lên lại."}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Chưa có bản xem trước. File đã được xử lý và dùng để AI tham chiếu khi soạn hợp đồng.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Metadata */}
        <div className="w-[280px] shrink-0 flex flex-col bg-muted/20">
          <div className="px-3 py-2 border-b text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Thông tin nguồn
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  File
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tên file</span>
                    <span className="truncate max-w-[140px]" title={source.fileName}>
                      {source.fileName}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Kích thước</span>
                    <span>{formatFileSize(source.fileSize)}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Loại</span>
                    <span className="text-xs truncate max-w-[120px]" title={source.mimeType}>
                      {source.mimeType.split("/").pop() ?? source.mimeType}
                    </span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  Trạng thái & Index
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2 items-center">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <Badge variant={source.status === "ready" ? "outline" : source.status === "error" ? "destructive" : "secondary"}>
                      {statusLabels[source.status] ?? source.status}
                    </Badge>
                  </li>
                  {source.pageCount != null && (
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Số trang</span>
                      <span>{source.pageCount}</span>
                    </li>
                  )}
                  {source.chunkCount != null && (
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Số đoạn index</span>
                      <span>{source.chunkCount}</span>
                    </li>
                  )}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Thời gian
                </h4>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Tải lên</span>
                    <span>{formatDistanceToNow(new Date(source.createdAt), { addSuffix: true, locale: vi })}</span>
                  </li>
                  {source.processedAt && (
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Xử lý xong</span>
                      <span>{formatDistanceToNow(new Date(source.processedAt), { addSuffix: true, locale: vi })}</span>
                    </li>
                  )}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  Thẻ
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {source.tags.length > 0 ? (
                    source.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">Chưa gắn thẻ</span>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
