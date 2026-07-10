"use client"

import { useState, useMemo } from "react"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { batchFillAndZip, type BatchFileItem, type ReplacementItem } from "@/lib/autofill/docx-batch-filler"
import { Button } from "@/components/ui/button"
import { Download, FileCheck, CheckCircle2, Upload, RefreshCw, FolderOpen } from "lucide-react"
import { toast } from "sonner"

interface FillResultItem {
  name: string
  blob: Blob | null
  count: number
  error?: boolean
  unsupported?: boolean
}

export function AutofillBatchFillTab() {
  const { bundles, currentBundleId } = useAutofillStore()
  const { customFields } = useUserFieldsStore()

  const [adhocFiles, setAdhocFiles] = useState<BatchFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMsg, setProgressMsg] = useState("")
  const [results, setResults] = useState<FillResultItem[]>([])
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)
  const [totalReplaced, setTotalReplaced] = useState<number>(0)

  const currentBundle = bundles.find((b) => b.id === currentBundleId) || bundles[0] || null

  const profileReplacements = useMemo<ReplacementItem[]>(() => {
    const list: ReplacementItem[] = []
    for (const cf of customFields) {
      if (!cf.defaultValue || !cf.defaultValue.trim()) continue
      list.push({
        value: cf.defaultValue.trim(),
        aliases: [
          cf.label,
          `[${cf.label.toUpperCase()}]`,
          `{{${cf.key}}}`,
          `[${cf.key.toUpperCase()}]`
        ],
      })
    }
    return list
  }, [customFields])

  const bundleStats = useMemo(() => {
    if (!currentBundle) return { totalDocs: 0, totalFields: 0, matchedFields: 0 }
    let totalFields = 0
    let matchedFields = 0
    for (const doc of currentBundle.documents) {
      if (doc.fileType !== "docx") continue
      for (const f of doc.fields) {
        totalFields++
        if (f.mappedKey) {
          const cf = customFields.find((x) => x.key === f.mappedKey)
          if (cf && cf.defaultValue && cf.defaultValue.trim()) {
            matchedFields++
          }
        } else {
          if (profileReplacements.some((r) => r.aliases.includes(f.placeholder))) {
            matchedFields++
          }
        }
      }
    }
    return { totalDocs: currentBundle.documents.filter((d) => d.fileType === "docx").length, totalFields, matchedFields }
  }, [currentBundle, customFields, profileReplacements])

  const handleAdhocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const newFiles: BatchFileItem[] = []
    for (const f of Array.from(e.target.files)) {
      if (f.name.endsWith(".docx")) {
        const buffer = await f.arrayBuffer()
        newFiles.push({ name: f.name, bufferOrBlob: buffer })
      }
    }
    setAdhocFiles((prev) => [...prev, ...newFiles])
    toast.success(`Đã thêm ${newFiles.length} file vào danh sách điền!`)
    e.target.value = ""
  }

  const handleRunBatchFill = async () => {
    if (!currentBundle && adhocFiles.length === 0) {
      toast.error("Vui lòng chọn bộ hồ sơ mẫu hoặc tải lên ít nhất 1 file .docx!")
      return
    }

    setIsProcessing(true)
    setProgressMsg("Đang chuẩn bị dữ liệu...")
    setResults([])
    setZipBlob(null)

    try {
      const filesToProcess: BatchFileItem[] = [...adhocFiles]
      if (currentBundle) {
        for (const doc of currentBundle.documents) {
          if (doc.fileType !== "docx") continue
          if (doc._base64 || doc._fileBase64 || doc._fileBuffer) {
            filesToProcess.push({
              name: doc.fileName,
              bufferOrBlob: doc._fileBuffer,
              _base64: doc._base64,
              _fileBase64: doc._fileBase64,
            })
          }
        }
      }

      if (filesToProcess.length === 0) {
        toast.error("Không có file .docx nào kèm dữ liệu gốc trong bộ này. Hãy tải lên file .docx để điền ngay!")
        setIsProcessing(false)
        return
      }

      const allReplacements: ReplacementItem[] = [...profileReplacements]
      if (currentBundle) {
        for (const doc of currentBundle.documents) {
          for (const f of doc.fields) {
            if (f.mappedKey) {
              const cf = customFields.find((x) => x.key === f.mappedKey)
              if (cf && cf.defaultValue && cf.defaultValue.trim()) {
                allReplacements.push({
                  value: cf.defaultValue.trim(),
                  aliases: [f.placeholder, f.label, `[${f.label.toUpperCase()}]`]
                })
              }
            }
          }
        }
      }

      const batchRes = await batchFillAndZip(filesToProcess, allReplacements, (idx, name) => {
        setProgressMsg(`Đang xử lý (${idx}/${filesToProcess.length}): ${name}...`)
      })

      setResults(batchRes.results)
      setZipBlob(batchRes.zipBlob)
      setTotalReplaced(batchRes.totalReplacements)
      toast.success(`Đã hoàn tất điền tự động ${filesToProcess.length} biểu mẫu!`)
    } catch (err) {
      toast.error("Có lỗi xảy ra trong quá trình xử lý file Word.")
    } finally {
      setIsProcessing(false)
      setProgressMsg("")
    }
  }

  const handleDownloadSingleBlob = (blob: Blob | null, name: string) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `DA_DIEN_${name}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownloadZip = () => {
    if (!zipBlob) return
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ho_so_da_dien_${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Action Box */}
      <div className="p-6 rounded-xl bg-muted/20 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {currentBundle && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                <FolderOpen className="h-3.5 w-3.5" /> {currentBundle.name}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold font-serif text-foreground">Điền Hồ Sơ Hàng Loạt & Xuất Trọn Bộ (.ZIP)</h3>
          <p className="text-xs text-muted-foreground max-w-2xl font-sans">
            Hệ thống sẽ đối chiếu và thay thế từ khóa placeholder trong <strong>{bundleStats.totalDocs} biểu mẫu Word</strong> với dữ liệu từ Profile Khách hàng.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-background hover:bg-muted text-foreground text-xs font-medium transition-all border border-border/80 shadow-2xs">
            <Upload className="h-3.5 w-3.5" /> Thêm file lẻ (.docx)
            <input type="file" multiple accept=".docx" onChange={handleAdhocUpload} className="hidden" />
          </label>
          <Button
            onClick={handleRunBatchFill}
            disabled={isProcessing}
            className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-5 py-2 h-9 text-xs rounded-md shadow-2xs gap-2"
          >
            {isProcessing ? "Đang điền hồ sơ..." : "ĐIỀN TỰ ĐỘNG VÀO TẤT CẢ"}
          </Button>
        </div>
      </div>

      {/* Progress / Status Bar */}
      {isProcessing && (
        <div className="p-3.5 rounded-md bg-muted/40 border border-border/60 flex items-center gap-2.5">
          <RefreshCw className="h-4 w-4 text-foreground animate-spin shrink-0" />
          <span className="text-xs font-medium text-foreground">{progressMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-border/60 bg-background">
          <span className="text-xs text-muted-foreground font-medium block">Biểu mẫu sẵn sàng</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-serif text-foreground">{bundleStats.totalDocs + adhocFiles.length}</span>
            <span className="text-xs text-muted-foreground">file Word</span>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-border/60 bg-background">
          <span className="text-xs text-muted-foreground font-medium block">Khớp thông tin Profile</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-serif text-foreground">{bundleStats.matchedFields} / {bundleStats.totalFields}</span>
            <span className="text-xs text-muted-foreground">trường có dữ liệu</span>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-border/60 bg-background">
          <span className="text-xs text-muted-foreground font-medium block">Kết quả điền gần nhất</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-serif text-foreground">{totalReplaced}</span>
            <span className="text-xs text-muted-foreground">vị trí đã thay thế</span>
          </div>
        </div>
      </div>

      {/* Adhoc files */}
      {adhocFiles.length > 0 && (
        <div className="p-4 rounded-lg border border-border/60 bg-muted/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">File lẻ bổ sung ({adhocFiles.length})</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground" onClick={() => setAdhocFiles([])}>
              Xóa danh sách
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {adhocFiles.map((f, idx) => (
              <div key={idx} className="px-2.5 py-1 rounded-md bg-background border border-border/60 text-xs font-medium flex items-center gap-2">
                <span>{f.name}</span>
                <button onClick={() => setAdhocFiles(adhocFiles.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground font-bold">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/20 border border-border/60">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-foreground shrink-0" />
              <div>
                <h4 className="text-sm font-bold font-serif text-foreground">
                  Hoàn tất điền tự động trọn bộ hồ sơ
                </h4>
                <p className="text-xs text-muted-foreground font-sans">
                  Đã thay thế <strong>{totalReplaced} vị trí</strong> trên {results.length} biểu mẫu.
                </p>
              </div>
            </div>

            {zipBlob && (
              <Button
                onClick={handleDownloadZip}
                className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-9 px-4 rounded-md shadow-2xs gap-2 shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Tải trọn bộ hồ sơ (.ZIP)
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border/60 bg-background hover:border-foreground/40 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                        res.error
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : "bg-muted/40 text-foreground border-border/40"
                      }`}
                    >
                      {res.error ? "× LỖI ĐỌC FILE" : "✓ ĐÃ ĐIỀN"}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {res.error ? "0 vị trí" : `Thay thế ${res.count} vị trí`}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-foreground mt-2 truncate" title={`DA_DIEN_${res.name}`}>
                    DA_DIEN_{res.name}
                  </h5>
                  {res.error && (
                    <p className="text-[11px] text-red-600 mt-1.5 leading-relaxed">
                      {(res as any).errorMessage || "Vui lòng sang Tab 2 tải lại file .docx này lên."}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-border/30">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadSingleBlob(res.blob, res.name)}
                    disabled={!res.blob || res.error}
                    className="text-xs h-7 px-2.5 gap-1 font-medium border-border/80 hover:bg-muted/60 rounded-md"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-muted-foreground" /> Tải file (.docx)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
