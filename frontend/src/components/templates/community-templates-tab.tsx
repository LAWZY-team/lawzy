"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { getDownloadUrl, type ContractTemplateFile } from "@/lib/api/contract-templates"
import { useContractTemplates } from "@/hooks/contract-templates/use-contract-templates"
import { useUploadContractTemplate } from "@/hooks/contract-templates/use-upload-contract-template"
import { useDeleteContractTemplate } from "@/hooks/contract-templates/use-delete-contract-template"
import { CommunityTemplateGrid } from "@/components/templates/community-template-grid"
import { CommunityTemplatePreviewModal } from "@/components/templates/community-template-preview-modal"
import { CommunityTemplateUploadModal } from "@/components/templates/community-template-upload-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TemplateViewMode } from "@/components/templates/template-filters"
import {
  CommunityTemplateFilters,
  type CommunityFileType,
  type CommunitySort,
} from "@/components/templates/community-template-filters"

function matchesFileType(fileName: string, type: CommunityFileType): boolean {
  if (type === "all") return true
  return fileName.toLowerCase().endsWith(`.${type}`)
}

export function CommunityTemplatesTab({
  searchQuery,
  onSearchChange,
  selectedFileType,
  onFileTypeChange,
  selectedSort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedFileType: CommunityFileType
  onFileTypeChange: (t: CommunityFileType) => void
  selectedSort: CommunitySort
  onSortChange: (s: CommunitySort) => void
  viewMode: TemplateViewMode
  onViewModeChange: (m: TemplateViewMode) => void
}) {
  const [selected, setSelected] = React.useState<ContractTemplateFile | null>(null)
  const [uploadOpen, setUploadOpen] = React.useState(false)

  const listQuery = useContractTemplates("community")
  const uploadMutation = useUploadContractTemplate()
  const deleteMutation = useDeleteContractTemplate()

  const files = React.useMemo<ContractTemplateFile[]>(() => listQuery.data?.files ?? [], [listQuery.data])

  const filteredFiles = React.useMemo(() => {
    let out = [...files]

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      out = out.filter((f) => {
        const hay = `${f.name ?? ""} ${f.fileName ?? ""} ${f.description ?? ""}`.toLowerCase()
        return hay.includes(q)
      })
    }

    out = out.filter((f) => matchesFileType(f.fileName, selectedFileType))

    switch (selectedSort) {
      case "recent":
        out.sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? ""))
        break
      case "az":
        out.sort((a, b) => (a.name ?? a.fileName).localeCompare(b.name ?? b.fileName))
        break
      case "za":
        out.sort((a, b) => (b.name ?? b.fileName).localeCompare(a.name ?? a.fileName))
        break
    }

    return out
  }, [files, searchQuery, selectedFileType, selectedSort])

  const onUpload = async (params: { file: File; name: string; description?: string }) => {
    try {
      await uploadMutation.mutateAsync(params)
      setUploadOpen(false)
      toast.success("Upload thành công")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload thất bại"
      toast.error(msg)
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Đã xóa")
      setSelected((prev) => (prev?.id === id ? null : prev))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Xóa thất bại"
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="shrink-0 flex items-end justify-between gap-3">
        <CommunityTemplateFilters
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedFileType={selectedFileType}
          onFileTypeChange={onFileTypeChange}
          selectedSort={selectedSort}
          onSortChange={onSortChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />

        <Button
          className="h-9"
          onClick={() => setUploadOpen(true)}
          disabled={uploadMutation.isPending}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>

      {listQuery.isError ? (
        <div className="text-destructive">Không tải được danh sách</div>
      ) : (
        <>
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-semibold">Không tìm thấy file</p>
              <p className="text-sm text-muted-foreground mt-2">
                Thử thay đổi bộ lọc hoặc tìm kiếm khác
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground shrink-0 mb-2">
                Tìm thấy {filteredFiles.length} file
              </p>
              <ScrollArea className="flex-1 min-h-0">
                <CommunityTemplateGrid
                  files={filteredFiles}
                  viewMode={viewMode}
                  onView={(f) => setSelected(f)}
                  onDownload={(f) => window.open(getDownloadUrl("community", f.id), "_blank")}
                  onDelete={(f) => onDelete(f.id)}
                />
              </ScrollArea>
            </>
          )}

          <CommunityTemplatePreviewModal
            file={selected}
            open={!!selected}
            onClose={() => setSelected(null)}
            onDelete={onDelete}
          />

          <CommunityTemplateUploadModal
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            existingFiles={files}
            onSubmit={onUpload}
            isSubmitting={uploadMutation.isPending}
          />
        </>
      )}
    </div>
  )
}

