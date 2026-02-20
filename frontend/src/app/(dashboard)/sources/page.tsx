"use client"

import { useRef, useState } from "react"
import { FolderInput, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useSources, useUploadSource } from "@/hooks/sources/use-sources"
import { useWorkspaceStore } from "@/stores/workspace-store"
import type { UploadSource } from "@/types/upload-source"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  completed: "Sẵn sàng",
  error: "Lỗi",
}

const statusVariants: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "default",
  ready: "outline",
  completed: "outline",
  error: "destructive",
}

export default function SourcesPage() {
  const { t } = useT()
  const { currentWorkspace } = useWorkspaceStore()
  const workspaceId = currentWorkspace?.id ?? ""
  const { data, isLoading } = useSources(workspaceId, { limit: 100 })
  const uploadMutation = useUploadSource()
  const [selectedSource, setSelectedSource] = useState<UploadSource | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const sources: UploadSource[] = (data?.data ?? []).map((s) => ({
    sourceId: s.id,
    workspaceId: workspaceId,
    fileName: s.title,
    title: s.title,
    mimeType: s.type,
    fileSize: 0,
    storagePath: s.s3Key ?? "",
    status: (s.status as UploadSource["status"]) ?? "completed",
    tags: s.tags ?? [],
    createdAt: s.createdAt,
    createdBy: s.user?.name ?? "",
  }))

  const handleAddSources = async (items: PendingSourceItem[]) => {
    let successCount = 0
    for (const item of items) {
      try {
        await uploadMutation.mutateAsync({
          file: item.file,
          title: item.title || item.file.name,
          type: item.file.type.includes("pdf") ? "pdf" : "docx",
          workspaceId,
          tags: item.tags,
        })
        successCount++
      } catch {
        toast.error(`Lỗi upload: ${item.file.name}`)
      }
    }
    if (successCount > 0) {
      toast.success(`Đã thêm ${successCount} nguồn`)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nguồn</h2>
          <p className="text-muted-foreground">
            {t("sources_subtitle")}
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
              <TableHead>Cập nhật</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  <FolderInput className="mx-auto h-10 w-10 opacity-50 mb-2" />
                  <p>{t("sources_empty")}</p>
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
                    {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true, locale: vi })}
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
