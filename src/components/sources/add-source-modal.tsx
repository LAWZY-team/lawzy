"use client"

import * as React from "react"
import { useRef, useCallback } from "react"
import { Upload, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]
const ALLOWED_EXT = [".pdf", ".docx", ".doc", ".txt"]
const SUGGESTED_TAGS = ["Chính sách", "Pháp lý", "Nội bộ", "Hợp đồng mẫu", "SaaS", "Điều khoản"]

export interface PendingSourceItem {
  id: string
  file: File
  title: string
  tags: string[]
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isFileAllowed(file: File): boolean {
  const okType = ALLOWED_TYPES.includes(file.type)
  const okExt = ALLOWED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))
  return (okType || okExt) && file.size <= MAX_FILE_SIZE
}

interface AddSourceModalProps {
  open: boolean
  onClose: () => void
  onAdd: (items: PendingSourceItem[]) => void
}

export function AddSourceModal({ open, onClose, onAdd }: AddSourceModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = React.useState<PendingSourceItem[]>([])
  const [isDragging, setIsDragging] = React.useState(false)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    const next: PendingSourceItem[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const error = file.size > MAX_FILE_SIZE
        ? `Vượt giới hạn ${formatFileSize(MAX_FILE_SIZE)}/file`
        : !isFileAllowed(file)
          ? "Định dạng không hỗ trợ. Chỉ PDF, DOCX, DOC, TXT."
          : undefined
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${i}`,
        file,
        title: file.name.replace(/\.[^.]+$/, "") || file.name,
        tags: [],
        error,
      })
    }
    setItems((prev) => [...prev, ...next])
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleSelectFiles = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files)
    e.target.value = ""
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const updateItem = (id: string, patch: Partial<Pick<PendingSourceItem, "title" | "tags">>) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x))
    )
  }

  const addTagToItem = (id: string, tag: string) => {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x
        const t = tag.trim()
        if (!t || x.tags.includes(t)) return x
        return { ...x, tags: [...x.tags, t] }
      })
    )
  }

  const removeTagFromItem = (id: string, tag: string) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, tags: x.tags.filter((t) => t !== tag) } : x
      )
    )
  }

  const handleSubmit = () => {
    const valid = items.filter((x) => !x.error)
    if (valid.length > 0) {
      onAdd(valid)
      setItems([])
      onClose()
    }
  }

  const handleClose = () => {
    setItems([])
    onClose()
  }

  const validCount = items.filter((x) => !x.error).length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Thêm nguồn"
      description="Tải lên file PDF, DOCX hoặc TXT làm tài liệu tham chiếu cho AI"
    >
      <div className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXT.join(",")}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleSelectFiles}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
          )}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium text-sm">
            Kéo thả file vào đây hoặc nhấn để chọn file
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, DOC, TXT — tối đa {formatFileSize(MAX_FILE_SIZE)}/file
          </p>
        </div>

        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Danh sách file ({items.length})</Label>
              {validCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {validCount} file hợp lệ
                </span>
              )}
            </div>
            <ScrollArea className="max-h-[280px] rounded-md border">
              <ul className="p-2 space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-md border p-3 bg-card",
                      item.error && "border-destructive/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.file.size)}
                            {item.error && (
                              <span className="text-destructive ml-1">· {item.error}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => removeItem(item.id)}
                        aria-label="Xóa"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {!item.error && (
                      <>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Tiêu đề hiển thị</Label>
                          <Input
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            placeholder="Tên nguồn"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Thẻ (tùy chọn)</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTED_TAGS.map((tag) => (
                              <Badge
                                key={tag}
                                variant={item.tags.includes(tag) ? "default" : "outline"}
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  item.tags.includes(tag)
                                    ? removeTagFromItem(item.id, tag)
                                    : addTagToItem(item.id, tag)
                                }
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={validCount === 0}
          >
            Thêm nguồn {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
