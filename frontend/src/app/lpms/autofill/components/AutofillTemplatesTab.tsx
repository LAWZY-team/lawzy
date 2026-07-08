"use client"

import { useState } from "react"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { extractDocxPlainText, extractPlaceholders, guessCanonicalMapping } from "@/lib/autofill/placeholder-detector"
import { AutofillLiveEditorModal } from "./AutofillLiveEditorModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderOpen, Plus, Trash2, Eye, FileText, Upload } from "lucide-react"
import { toast } from "sonner"
import mammoth from "mammoth"

export function AutofillTemplatesTab() {
  const { bundles, currentBundleId, setCurrentBundleId, createBundle, deleteBundle, addDocToBundle, removeDocFromBundle } = useAutofillStore()
  const { customFields, updateCustomField, addCustomField } = useUserFieldsStore()

  const [isCreatingBundle, setIsCreatingBundle] = useState(false)
  const [newBundleName, setNewBundleName] = useState("")
  const [newBundleScope, setNewBundleScope] = useState<"workspace" | "user">("workspace")
  const [newBundleDesc, setNewBundleDesc] = useState("")

  const [activeDocForPreview, setActiveDocForPreview] = useState<{ bundleId: string; docId: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isQuickFillModalOpen, setIsQuickFillModalOpen] = useState(false)
  const [quickFillValues, setQuickFillValues] = useState<Record<string, string>>({})

  const currentBundle = bundles.find((b) => b.id === currentBundleId) || bundles[0] || null

  const handleCreateNewBundle = () => {
    if (!newBundleName.trim()) return
    const id = createBundle(newBundleName.trim(), newBundleScope, newBundleDesc.trim())
    setIsCreatingBundle(false)
    setNewBundleName("")
    setNewBundleDesc("")
    toast.success("Đã tạo bộ hồ sơ mẫu mới!")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentBundle || !e.target.files?.length) return
    setIsUploading(true)
    const files = Array.from(e.target.files).filter((f) => /\.(docx|pdf)$/i.test(f.name))

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer()
        const plainText = await extractDocxPlainText(buffer)
        const placeholders = extractPlaceholders(plainText)

        let previewHtml: string | null = null
        try {
          const res = await mammoth.convertToHtml({ arrayBuffer: buffer })
          if (res && res.value) previewHtml = res.value
        } catch {}

        const fields = placeholders.map((ph, idx) => {
          const cleanLabel = ph.replace(/^[\[\{\<]+|[\]\}\>]+$/g, "").trim()
          return {
            id: `f_${Date.now()}_${idx}`,
            label: cleanLabel || `Trường ${idx + 1}`,
            placeholder: ph,
            mappedKey: guessCanonicalMapping(ph),
            source: "auto" as const,
            count: plainText.match(new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length || 1,
          }
        })

        addDocToBundle(currentBundle.id, {
          fileName: file.name,
          fileType: file.name.endsWith(".pdf") ? "pdf" : "docx",
          status: "done",
          fields,
          plainText,
          previewHtml,
          _fileBuffer: buffer,
        })
      } catch (err) {
        toast.error(`Không thể đọc tài liệu: ${file.name}`)
      }
    }
    setIsUploading(false)
    toast.success(`Đã tải lên và quét placeholder cho ${files.length} biểu mẫu!`)
    e.target.value = ""
  }

  const handleOpenQuickFill = () => {
    if (!currentBundle) return
    const initial: Record<string, string> = {}
    for (const doc of currentBundle.documents) {
      for (const f of doc.fields) {
        if (f.mappedKey && !initial[f.mappedKey]) {
          const cf = customFields.find((x) => x.key === f.mappedKey)
          initial[f.mappedKey] = cf?.defaultValue || ""
        }
      }
    }
    setQuickFillValues(initial)
    setIsQuickFillModalOpen(true)
  }

  const handleSaveQuickFillToProfile = () => {
    let count = 0
    for (const [key, val] of Object.entries(quickFillValues)) {
      if (!val.trim()) continue
      const existing = customFields.find((x) => x.key === key)
      if (existing) {
        updateCustomField(key, { defaultValue: val })
      } else {
        addCustomField({ key, label: key, defaultValue: val })
      }
      count++
    }
    setIsQuickFillModalOpen(false)
    toast.success(`Đã cập nhật ${count} trường thông tin vào Profile Khách hàng!`)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1.5">
            {bundles.map((bundle) => {
              const active = bundle.id === (currentBundle?.id || currentBundleId)
              return (
                <button
                  key={bundle.id}
                  onClick={() => setCurrentBundleId(bundle.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "bg-foreground text-background font-semibold"
                      : "border border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {bundle.name}
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted/40 text-current border border-current/20">
                    {bundle.documents.length}
                  </span>
                </button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingBundle(true)}
            className="h-8 text-xs gap-1 shrink-0 ml-1 border-dashed border-border/80 rounded-md"
          >
            <Plus className="h-3.5 w-3.5" /> Tạo Bộ mới
          </Button>
        </div>

        {currentBundle && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleOpenQuickFill}
              variant="outline"
              size="sm"
              className="text-xs h-8 px-3 border-border/80 text-foreground hover:bg-muted/60 font-medium rounded-md gap-1.5"
            >
              Điền nhanh cho bộ này
            </Button>
            {bundles.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteBundle(currentBundle.id)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Xóa bộ hồ sơ này"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Current Bundle Workspace */}
      {!currentBundle ? (
        <div className="text-center py-16 text-muted-foreground text-xs">Chưa chọn bộ hồ sơ mẫu.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-serif text-foreground">{currentBundle.name}</h3>
              <p className="text-xs text-muted-foreground">
                {currentBundle.description || "Bộ hồ sơ mẫu dùng cho chế độ điền tự động."}
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium bg-foreground text-background hover:bg-foreground/90 h-8 px-3.5 shadow-2xs">
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? "Đang quét..." : "Tải lên biểu mẫu (.docx)"}
                <input type="file" multiple accept=".docx,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Documents Grid */}
          {currentBundle.documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-border/40 rounded-xl bg-muted/10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h4 className="text-sm font-semibold text-foreground">Chưa có biểu mẫu nào trong bộ này</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Tải lên các file Word (<code className="font-mono bg-muted/40 px-1 py-0.5 rounded border border-border/40">.docx</code>) chứa placeholder để hệ thống quét.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium shadow-2xs hover:bg-foreground/90">
                <Upload className="h-3.5 w-3.5" /> Chọn file .docx từ máy tính
                <input type="file" multiple accept=".docx,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentBundle.documents.map((doc) => {
                const mappedCount = doc.fields.filter((f) => Boolean(f.mappedKey)).length
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between p-4 rounded-lg border border-border/60 bg-background hover:border-foreground/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs font-semibold text-foreground truncate" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Placeholder phát hiện:</span>
                          <strong className="text-foreground font-medium">{doc.fields.length} từ khóa</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Đã ánh xạ vào Profile:</span>
                          <strong className="text-foreground font-semibold">{mappedCount} / {doc.fields.length}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-4 border-t border-border/30 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveDocForPreview({ bundleId: currentBundle.id, docId: doc.id })}
                        className="flex-1 text-xs h-8 gap-1.5 font-medium border-border/80 hover:bg-muted/60"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        Live Editor
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDocFromBundle(currentBundle.id, doc.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Live Editor */}
      {activeDocForPreview && (
        <AutofillLiveEditorModal
          isOpen={true}
          onClose={() => setActiveDocForPreview(null)}
          bundleId={activeDocForPreview.bundleId}
          docId={activeDocForPreview.docId}
        />
      )}

      {/* Modal Create Bundle */}
      {isCreatingBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl border border-border space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold font-serif text-foreground">Tạo Bộ Hồ Sơ Mẫu Mới</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Tên bộ hồ sơ mẫu</label>
                <Input
                  value={newBundleName}
                  onChange={(e) => setNewBundleName(e.target.value)}
                  placeholder="VD: Bộ hồ sơ chuyển nhượng cổ phần"
                  className="h-8 text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Mô tả ngắn</label>
                <Input
                  value={newBundleDesc}
                  onChange={(e) => setNewBundleDesc(e.target.value)}
                  placeholder="Ghi chú về biểu mẫu..."
                  className="h-8 text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreatingBundle(false)} className="h-8 text-xs rounded-md border-border/80">Hủy</Button>
              <Button size="sm" onClick={handleCreateNewBundle} disabled={!newBundleName.trim()} className="bg-foreground text-background hover:bg-foreground/90 h-8 text-xs rounded-md">Tạo & Chọn</Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Fill Modal */}
      {isQuickFillModalOpen && currentBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl bg-background shadow-xl border border-border overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border/60 bg-muted/20">
              <h3 className="text-base font-bold font-serif text-foreground">
                Điền nhanh thông tin cho "{currentBundle.name}"
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Các giá trị nhập ở đây sẽ tự động lưu thẳng vào Profile Khách hàng.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 divide-y divide-border/40">
              {Object.keys(quickFillValues).length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Bộ hồ sơ này chưa có trường placeholder nào được ánh xạ.
                </div>
              ) : (
                Object.entries(quickFillValues).map(([key, val]) => {
                  const cf = customFields.find((x) => x.key === key)
                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 first:pt-0">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground block">{cf?.label || key}</span>
                        <code className="text-[10px] font-mono text-muted-foreground">{key}</code>
                      </div>
                      <Input
                        value={val}
                        onChange={(e) => setQuickFillValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Nhập giá trị..."
                        className="h-8 text-xs w-full sm:w-64 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
                      />
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setIsQuickFillModalOpen(false)} className="h-8 text-xs rounded-md border-border/80">Hủy</Button>
              <Button size="sm" onClick={handleSaveQuickFillToProfile} className="bg-foreground text-background hover:bg-foreground/90 h-8 text-xs rounded-md">
                Lưu vào Profile Khách hàng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
