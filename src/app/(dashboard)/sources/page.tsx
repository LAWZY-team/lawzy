"use client"

import { useState } from "react"
import { FolderInput, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Modal } from "@/components/ui/modal"
import { SourceDetailSplit } from "@/components/sources/source-detail-split"
import { AddSourceModal, type PendingSourceItem } from "@/components/sources/add-source-modal"
import uploadSourcesData from "@/mock/upload-sources.json"
import type { UploadSource } from "@/types/upload-source"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  error: "Lỗi",
}

const statusVariants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "default",
  ready: "outline",
  error: "destructive",
}

const initialSources = uploadSourcesData.sources as UploadSource[]

export default function SourcesPage() {
  const [sources, setSources] = useState<UploadSource[]>(initialSources)
  const [selectedSource, setSelectedSource] = useState<UploadSource | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const handleAddSources = (items: PendingSourceItem[]) => {
    const now = new Date().toISOString()
    const newSources: UploadSource[] = items.map((item, i) => ({
      sourceId: `src-${Date.now()}-${i}`,
      workspaceId: "org001",
      fileName: item.file.name,
      title: item.title || item.file.name,
      mimeType: item.file.type,
      fileSize: item.file.size,
      storagePath: "",
      status: "processing",
      tags: item.tags,
      createdAt: now,
      createdBy: "current-user",
    }))
    setSources((prev) => [...newSources, ...prev])
    toast.success(`Đã thêm ${items.length} nguồn. Đang xử lý…`)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nguồn</h2>
          <p className="text-muted-foreground">
            Tài liệu tham chiếu pháp lý / nghiệp vụ để AI trích dẫn khi soạn hợp đồng
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm nguồn
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên / Tiêu đề</TableHead>
              <TableHead>Thẻ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Trang / Chunk</TableHead>
              <TableHead>Cập nhật</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  <FolderInput className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  <p>Chưa có nguồn nào. Thêm file PDF, DOCX hoặc TXT để AI tham chiếu khi soạn hợp đồng.</p>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow
                  key={source.sourceId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSource(source)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{source.title}</p>
                      <p className="text-xs text-muted-foreground">{source.fileName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {source.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[source.status] ?? "secondary"}>
                      {statusLabels[source.status] ?? source.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {source.pageCount != null && source.chunkCount != null
                      ? `${source.pageCount} trang, ${source.chunkCount} đoạn`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {source.processedAt
                      ? formatDistanceToNow(new Date(source.processedAt), { addSuffix: true, locale: vi })
                      : formatDistanceToNow(new Date(source.createdAt), { addSuffix: true, locale: vi })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        open={!!selectedSource}
        onClose={() => setSelectedSource(null)}
        size="full"
        showCloseButton={false}
        title={selectedSource?.title}
      >
        {selectedSource && (
          <SourceDetailSplit
            source={selectedSource}
            onClose={() => setSelectedSource(null)}
          />
        )}
      </Modal>

      <AddSourceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddSources}
      />
    </div>
  )
}
