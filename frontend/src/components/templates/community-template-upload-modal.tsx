"use client"

import * as React from "react"
import { Upload, FileText } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ContractTemplateFile } from "@/lib/api/contract-templates"

function baseNameFromFile(file: File): string {
  return file.name.replace(/\.[^/.]+$/, "").trim()
}

function makeUniqueName(base: string, existing: Set<string>): string {
  const normalizedBase = base.trim() || "template"
  if (!existing.has(normalizedBase)) return normalizedBase
  for (let i = 2; i < 200; i++) {
    const candidate = `${normalizedBase} (${i})`
    if (!existing.has(candidate)) return candidate
  }
  return `${normalizedBase} (${Date.now()})`
}

export function CommunityTemplateUploadModal({
  open,
  onClose,
  existingFiles,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onClose: () => void
  existingFiles: ContractTemplateFile[]
  onSubmit: (params: { file: File; name: string; description?: string }) => void
  isSubmitting: boolean
}) {
  const [file, setFile] = React.useState<File | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  const existingNames = React.useMemo(() => {
    const s = new Set<string>()
    for (const f of existingFiles) {
      s.add((f.name ?? f.fileName).trim())
    }
    return s
  }, [existingFiles])

  React.useEffect(() => {
    if (!open) {
      setFile(null)
      setName("")
      setDescription("")
    }
  }, [open])

  const onPickFile = (f: File | null) => {
    setFile(f)
    if (!f) return
    const base = baseNameFromFile(f)
    setName((prev) => prev.trim() || makeUniqueName(base, existingNames))
  }

  const canSubmit = !!file && !!name.trim() && !isSubmitting

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Upload mẫu hợp đồng (Cộng đồng)">
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <Label>Tên</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: NDA - Công ty A"
          />
        </div>

        <div className="space-y-2">
          <Label>Mô tả ngắn</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>File</Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            onClick={() =>
              file && onSubmit({ file, name: name.trim(), description: description.trim() || undefined })
            }
            disabled={!canSubmit}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  )
}

