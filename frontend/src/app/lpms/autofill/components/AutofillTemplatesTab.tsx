"use client"

import { useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { extractDocxPlainText, extractPlaceholders, guessCanonicalMapping } from "@/lib/autofill/placeholder-detector"
import { AutofillLiveEditorModal } from "./AutofillLiveEditorModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FolderOpen, Plus, Trash2, Eye, FileText, Upload, ArrowRight, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { DEFAULT_LABEL_BY_KEY } from "@/lib/editor/user-field-profile"
import mammoth from "mammoth"

interface AutofillTemplatesTabProps {
  onNavigateTab?: (tab: "profile" | "templates" | "fill") => void
}

export function AutofillTemplatesTab({ onNavigateTab }: AutofillTemplatesTabProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const { bundles, currentBundleId, setCurrentBundleId, createBundle, deleteBundle, addDocToBundle, removeDocFromBundle } = useAutofillStore()
  const {
    customFields,
    updateCustomField,
    addCustomField,
    clientProfiles = [],
    currentProfileId,
    setCurrentProfileId,
    createProfile,
    updateProfile,
  } = useUserFieldsStore()

  const [isCreatingBundle, setIsCreatingBundle] = useState(false)
  const [newBundleName, setNewBundleName] = useState("")
  const [newBundleScope, setNewBundleScope] = useState<"workspace" | "user">("workspace")
  const [newBundleDesc, setNewBundleDesc] = useState("")

  const [activeDocForPreview, setActiveDocForPreview] = useState<{ bundleId: string; docId: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const currentBundle = bundles.find((b) => b.id === currentBundleId) || bundles[0] || null
  const activeProfile = (clientProfiles || []).find((p) => p.id === currentProfileId) || (clientProfiles || [])[0] || null

  const bundleUniqueKeys = useMemo(() => {
    if (!currentBundle) return []
    const map = new Map<string, { key: string; rawPlaceholder: string; docCount: number }>()
    for (const doc of currentBundle.documents) {
      if (doc.fileType !== "docx") continue
      for (const f of doc.fields) {
        const key = f.mappedKey || f.placeholder.replace(/^\[|\]$|^\{\{|\}\}$/g, "").trim()
        if (!key) continue
        if (!map.has(key)) {
          map.set(key, { key, rawPlaceholder: f.placeholder, docCount: 1 })
        } else {
          map.get(key)!.docCount += 1
        }
      }
    }
    return Array.from(map.values())
  }, [currentBundle])

  const handleCreateClientProfileFromBundle = () => {
    if (!currentBundle) return
    const allKeys = new Set<string>()
    for (const doc of currentBundle.documents) {
      if (doc.fileType !== "docx") continue
      for (const f of doc.fields) {
        const keyToUse = f.mappedKey || f.placeholder.replace(/^\[|\]$|^\{\{|\}\}$/g, "").trim()
        if (keyToUse) allKeys.add(keyToUse)
      }
    }
    if (allKeys.size === 0) {
      toast.error("Bộ hồ sơ này chưa có biểu mẫu .docx hoặc chưa bóc tách được từ khóa nào!")
      return
    }
    const initialValues: Record<string, string> = {}
    for (const k of allKeys) {
      initialValues[k] = activeProfile?.values?.[k] || ""
    }
    const newId = createProfile(
      `${currentBundle.name} - Khách Hàng ${clientProfiles.length + 1}`,
      `Đóng gói cho bộ mẫu "${currentBundle.name}" ngày ${new Date().toLocaleDateString("vi-VN")}`,
      initialValues
    )
    setCurrentProfileId(newId)
    toast.success(`Đã khởi tạo Bộ Khách Hàng mới (${allKeys.size} từ khóa)! Bạn có thể nhập liệu ngay bên dưới.`)
  }

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
    const files = Array.from(e.target.files).filter((f) => /\.(docx|doc|pdf)$/i.test(f.name))

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

        let base64Str = ""
        try {
          const bytes = new Uint8Array(buffer)
          let binary = ""
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          base64Str = window.btoa(binary)
        } catch {}

        addDocToBundle(currentBundle.id, {
          fileName: file.name,
          fileType: file.name.endsWith(".pdf") ? "pdf" : "docx",
          status: "done",
          fields,
          plainText,
          previewHtml,
          _fileBuffer: buffer,
          _base64: base64Str,
          _fileBase64: base64Str,
        })
      } catch (err) {
        toast.error(`Không thể đọc tài liệu: ${file.name}`)
      }
    }
    setIsUploading(false)
    toast.success(`Đã tải lên và quét placeholder cho ${files.length} biểu mẫu!`)
    e.target.value = ""
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
                      ? "bg-foreground text-background font-semibold shadow-2xs"
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={handleCreateClientProfileFromBundle}
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs h-8 px-3 rounded-md shadow-2xs gap-1.5"
            >
              ⚡ Khởi tạo Khách Hàng từ Bộ mẫu này
            </Button>
            {bundles.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteBundle(currentBundle.id)}
                className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-md"
                title="Xóa bộ hồ sơ mẫu này"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Current Bundle Workspace */}
      {!currentBundle ? (
        <div className="p-10 rounded-xl border border-dashed border-border/80 bg-muted/10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-8 space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-foreground">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-serif font-bold text-foreground">
              Bạn chưa có Bộ Hồ Sơ Mẫu nào
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed font-sans">
              Đây là nơi quản lý các biểu mẫu Word (<code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded border border-border/40">.docx</code>) chứa từ khóa trong cặp ngoặc vuông <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded border border-border/40">[...]</code> hoặc <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded border border-border/40">{"{{...}}"}</code>. Hãy tạo Bộ mẫu mới đầu tiên của bạn để tải file lên.
            </p>
          </div>
          <div className="flex items-center justify-center pt-3">
            <Button
              onClick={() => setIsCreatingBundle(true)}
              className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-9 px-5 rounded-md shadow-2xs gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> + Tạo Bộ Hồ Sơ Mẫu Mới Ngay
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
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
                {isUploading ? "Đang quét..." : "Tải lên biểu mẫu (.docx, .doc)"}
                <input type="file" multiple accept=".docx,.doc,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Documents Grid */}
          {currentBundle.documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-border/40 rounded-xl bg-muted/10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h4 className="text-sm font-semibold text-foreground">Chưa có biểu mẫu nào trong bộ này</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Tải lên các file Word (<code className="font-mono bg-muted/40 px-1 py-0.5 rounded border border-border/40">.docx, .doc</code>) chứa placeholder để hệ thống quét.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium shadow-2xs hover:bg-foreground/90">
                <Upload className="h-3.5 w-3.5" /> Chọn file Word từ máy tính
                <input type="file" multiple accept=".docx,.doc,.pdf" onChange={handleFileUpload} className="hidden" />
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
                        onClick={() => {
                          const basePath = pathname.startsWith("/lpms") ? "/lpms/autofill" : "/autofill"
                          router.push(`${basePath}/editor/${currentBundle.id}/${doc.id}`)
                        }}
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

          {/* Integrated Live Placeholders & Profile Filler */}
          {currentBundle.documents.length > 0 && (
            <div className="pt-6 border-t border-border/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/60">
                <div className="space-y-1">
                  <h4 className="text-sm font-serif font-bold text-foreground flex items-center gap-2">
                    <span>📝 Bảng Theo Dõi Từ Khóa & Điền Liệu Cho Bộ Mẫu</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-foreground text-background font-semibold">
                      {bundleUniqueKeys.length} từ khóa
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Toàn bộ từ khóa bóc tách từ các file .docx trên. Chọn Khách Hàng để điền liệu trực tiếp theo bộ mẫu này:
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">Khách Hàng:</span>
                  <select
                    value={activeProfile?.id || ""}
                    onChange={(e) => setCurrentProfileId(e.target.value)}
                    className="h-8 text-xs bg-background border border-border/60 rounded-md px-3 font-medium focus:outline-hidden focus:ring-1 focus:ring-foreground max-w-[220px]"
                  >
                    <option value="" disabled>--- Chọn Khách Hàng ---</option>
                    {(clientProfiles || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({Object.keys(p.values || {}).length} trường)
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleCreateClientProfileFromBundle}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold px-3 rounded-md gap-1 border-border/80 hover:bg-muted"
                  >
                    ⚡ Khởi tạo Bộ mới
                  </Button>
                  <Button
                    onClick={() => onNavigateTab?.("fill")}
                    size="sm"
                    className="bg-foreground text-background hover:bg-foreground/90 h-8 text-xs font-semibold px-3.5 rounded-md shadow-2xs gap-1.5"
                  >
                    Ghép & Xuất .ZIP <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {bundleUniqueKeys.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg bg-muted/10">
                  Bộ mẫu này chưa bóc tách được từ khóa nào. Hãy tải lên file .docx có chứa từ khóa trong ngoặc vuông <code className="font-mono bg-muted px-1 py-0.5 rounded">[...]</code>.
                </div>
              ) : !activeProfile ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg bg-muted/10 flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                  <span>Bạn có <strong>{bundleUniqueKeys.length} từ khóa</strong> sẵn sàng điền. Hãy chọn 1 Bộ Khách Hàng ở menu trên hoặc bấm <strong>⚡ Khởi tạo Khách Hàng từ Bộ mẫu này</strong> để bắt đầu nhập liệu ngay.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {bundleUniqueKeys.map((item) => {
                    const currentVal = activeProfile.values?.[item.key] ?? ""
                    return (
                      <div
                        key={item.key}
                        className="p-4 rounded-lg border border-border/60 bg-background hover:border-foreground/40 transition-colors flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-xs font-semibold text-foreground truncate" title={item.key}>
                              {DEFAULT_LABEL_BY_KEY[item.key] || item.key}
                            </span>
                            <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold shrink-0 border border-border/40">
                              {item.rawPlaceholder}
                            </code>
                          </div>
                          <div>
                            <Input
                              value={currentVal}
                              onChange={(e) => {
                                const newVals = { ...(activeProfile.values || {}), [item.key]: e.target.value }
                                updateProfile(activeProfile.id, { values: newVals })
                              }}
                              placeholder="Chưa nhập giá trị..."
                              className="h-8 text-xs font-medium bg-background border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
                          <span>Xuất hiện trong <strong className="text-foreground">{item.docCount}</strong> biểu mẫu</span>
                          {currentVal ? (
                            <span className="text-foreground font-mono font-semibold">✓ Đã điền</span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Chưa điền</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
    </div>
  )
}
