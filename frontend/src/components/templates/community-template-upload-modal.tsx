"use client"

import * as React from "react"
import { Upload, FileText } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { ContractTemplateFile } from "@/lib/api/contract-templates"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

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
  const { t } = useT()
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
    if (f && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error(t("tmpl_pdf_only"))
      setFile(null)
      return
    }
    setFile(f)
    if (!f) return
    const base = baseNameFromFile(f)
    setName((prev) => prev.trim() || makeUniqueName(base, existingNames))
  }

  const canSubmit = !!file && !!name.trim() && !isSubmitting

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t("tmpl_comm_upload_title")}>
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <Label>{t("tmpl_comm_name")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("tmpl_comm_name_placeholder")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("tmpl_comm_desc")}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("tmpl_comm_desc_placeholder")}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("files_table_name")}</Label>
          <Input
            type="file"
            accept=".pdf,application/pdf"
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
            {t("common_cancel")}
          </Button>
          <Button
            onClick={() =>
              file && onSubmit({ file, name: name.trim(), description: description.trim() || undefined })
            }
            disabled={!canSubmit}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("tmpl_upload_action")}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

