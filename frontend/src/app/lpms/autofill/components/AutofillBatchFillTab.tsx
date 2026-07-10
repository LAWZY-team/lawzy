"use client"

import { useState, useMemo } from "react"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { batchFillAndZip, type BatchFileItem, type ReplacementItem } from "@/lib/autofill/docx-batch-filler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, FileCheck, CheckCircle2, Upload, RefreshCw, FolderOpen, AlertTriangle, ArrowRight, Copy } from "lucide-react"
import { toast } from "sonner"

interface FillResultItem {
  name: string
  blob: Blob | null
  count: number
  error?: boolean
  unsupported?: boolean
}

interface AutofillBatchFillTabProps {
  onNavigateTab?: (tab: "profile" | "templates" | "fill") => void
}

export function AutofillBatchFillTab({ onNavigateTab }: AutofillBatchFillTabProps = {}) {
  const { bundles, currentBundleId, setCurrentBundleId } = useAutofillStore()
  const {
    customFields,
    clientProfiles = [],
    currentProfileId,
    setCurrentProfileId,
    updateProfile,
    duplicateAndSupplementProfile,
  } = useUserFieldsStore()

  const [adhocFiles, setAdhocFiles] = useState<BatchFileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMsg, setProgressMsg] = useState("")
  const [results, setResults] = useState<FillResultItem[]>([])
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)
  const [totalReplaced, setTotalReplaced] = useState<number>(0)
  const [deltaInputs, setDeltaInputs] = useState<Record<string, string>>({})

  const currentBundle = useMemo(() => {
    return bundles.find((b) => b.id === currentBundleId) || bundles[0] || null
  }, [bundles, currentBundleId])

  const currentProfile = useMemo(() => {
    return (clientProfiles || []).find((p) => p.id === currentProfileId) || (clientProfiles || [])[0] || null
  }, [clientProfiles, currentProfileId])

  // Extract all distinct required placeholders from current bundle documents (.docx)
  const requiredFieldsInfo = useMemo(() => {
    if (!currentBundle) return []
    const map = new Map<string, { key: string; placeholder: string; label: string }>()
    for (const doc of currentBundle.documents) {
       if (doc.fileType !== "docx") continue
       for (const f of doc.fields) {
         const keyToUse = f.mappedKey || f.placeholder.replace(/^\[|\]$|^\{\{|\}\}$/g, "").trim()
         if (keyToUse && !map.has(keyToUse)) {
           map.set(keyToUse, {
             key: keyToUse,
             placeholder: f.placeholder,
             label: f.label || keyToUse,
           })
         }
       }
    }
    return Array.from(map.values())
  }, [currentBundle])

  // Compute missing fields (Delta) that are not yet filled inside currentProfile.values
  const missingFields = useMemo(() => {
    if (!currentProfile || !currentProfile.values) return requiredFieldsInfo
    return requiredFieldsInfo.filter((item) => {
      const val = currentProfile.values[item.key]
      const cfVal = customFields.find((c) => c.key === item.key)?.defaultValue
      const actualVal = val ?? cfVal
      return !actualVal || !actualVal.trim()
    })
  }, [requiredFieldsInfo, currentProfile, customFields])

  const profileReplacements = useMemo<ReplacementItem[]>(() => {
    const list: ReplacementItem[] = []
    const valuesMap = { ...(currentProfile?.values || {}), ...deltaInputs }

    // 1. Gộp từ customFields
    for (const cf of customFields) {
      const val = valuesMap[cf.key] ?? cf.defaultValue
      if (!val || !val.trim()) continue
      list.push({
        value: val.trim(),
        aliases: [
          `[${cf.label.toUpperCase()}]`,
          `[${cf.label}]`,
          `{{${cf.key}}}`,
          `[${cf.key.toUpperCase()}]`,
          `[${cf.key}]`,
          cf.label,
          cf.key,
        ],
      })
    }

    // 2. Gộp từ tất cả key trong valuesMap
    for (const [key, val] of Object.entries(valuesMap)) {
      if (!val || !val.trim()) continue
      const cf = customFields.find((x) => x.key === key)
      const label = cf?.label || key
      list.push({
        value: val.trim(),
        aliases: [
          `[${label.toUpperCase()}]`,
          `[${label}]`,
          `[${key.toUpperCase()}]`,
          `[${key}]`,
          `{{${key}}}`,
          `{{${label}}}`,
          label,
          key,
        ],
      })
    }

    // 3. Gộp trực tiếp từ tất cả placeholder phát hiện được trong biểu mẫu của bộ hiện tại
    if (currentBundle && currentBundle.documents) {
      for (const doc of currentBundle.documents) {
        if (doc.fileType !== "docx") continue
        for (const f of doc.fields) {
          const cleanKey = f.mappedKey || f.placeholder.replace(/^[\[\{\<]+|[\]\}\>]+$/g, "").trim()
          const val = valuesMap[cleanKey] || valuesMap[f.placeholder] || valuesMap[f.label]
          if (val && val.trim()) {
            list.push({
              value: val.trim(),
              aliases: [
                f.placeholder,
                `[${cleanKey.toUpperCase()}]`,
                `[${cleanKey}]`,
                `{{${cleanKey}}}`,
                cleanKey,
              ],
            })
          }
        }
      }
    }

    return list
  }, [currentProfile, customFields, deltaInputs, currentBundle])

  const bundleStats = useMemo(() => {
    if (!currentBundle) return { totalDocs: 0, totalFields: 0, matchedFields: 0 }
    let totalFields = 0
    let matchedFields = 0
    for (const doc of currentBundle.documents) {
      if (doc.fileType !== "docx") continue
      for (const f of doc.fields) {
        totalFields++
        const key = f.mappedKey || f.placeholder.replace(/^\[|\]$|^\{\{|\}\}$/g, "").trim()
        const val = currentProfile?.values?.[key] || deltaInputs[key] || customFields.find((x) => x.key === key)?.defaultValue
        if (val && val.trim()) {
          matchedFields++
        }
      }
    }
    return {
      totalDocs: currentBundle.documents.filter((d) => d.fileType === "docx").length,
      totalFields,
      matchedFields,
    }
  }, [currentBundle, currentProfile, customFields, deltaInputs])

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

  const runActualFillProcess = async () => {
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

  const handleUpdateAndFillCurrent = async () => {
    if (currentProfile && Object.keys(deltaInputs).length > 0) {
      updateProfile(currentProfile.id, {
        values: { ...(currentProfile.values || {}), ...deltaInputs },
      })
      toast.success(`Đã cập nhật các trường bổ sung vào bộ "${currentProfile.name}"`)
    }
    await runActualFillProcess()
  }

  const handleDuplicateAndFillNew = async () => {
    if (!currentProfile) return
    if (Object.keys(deltaInputs).length === 0) {
      await runActualFillProcess()
      return
    }
    const newName = `${currentProfile.name} (Bổ sung cho ${currentBundle?.name || "Bộ mẫu"})`
    duplicateAndSupplementProfile(currentProfile.id, newName, deltaInputs)
    setDeltaInputs({})
    toast.success(`Đã nhân bản thành bộ mới "${newName}" và điền hồ sơ!`)
    await runActualFillProcess()
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
      {/* Notion-style Cross-Matching Control Panel */}
      <div className="p-6 rounded-xl bg-muted/20 border border-border/60 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-serif text-foreground">Ghép Chéo Hồ Sơ & Xuất Trọn Bộ (.ZIP)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Chọn 1 <strong>Bộ Hồ Sơ Mẫu</strong> kết hợp với 1 <strong>Bộ Khách Hàng</strong>. Hệ thống sẽ tự động đối chiếu từ khóa và báo trường còn thiếu.
            </p>
          </div>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-background hover:bg-muted text-foreground text-xs font-medium transition-all border border-border/80 shadow-2xs shrink-0">
            <Upload className="h-3.5 w-3.5" /> Thêm file lẻ (.docx)
            <input type="file" multiple accept=".docx" onChange={handleAdhocUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" /> 1. Chọn Bộ Hồ Sơ Mẫu:
            </label>
            <select
              value={currentBundle?.id || ""}
              onChange={(e) => setCurrentBundleId(e.target.value)}
              className="w-full h-9 text-xs bg-background border border-border/60 rounded-md px-3 font-medium focus:outline-hidden focus:ring-1 focus:ring-foreground"
            >
              {bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.documents.filter((d) => d.fileType === "docx").length} file Word)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> 2. Chọn Bộ Khách Hàng Áp Dụng:
            </label>
            <select
              value={currentProfile?.id || ""}
              onChange={(e) => setCurrentProfileId(e.target.value)}
              className="w-full h-9 text-xs bg-background border border-border/60 rounded-md px-3 font-medium focus:outline-hidden focus:ring-1 focus:ring-foreground"
            >
              {(clientProfiles || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({Object.keys(p.values || {}).length} trường)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Delta Box or Ready Status */}
        {!currentBundle || !currentProfile ? (
          <div className="p-6 rounded-lg bg-background border border-dashed border-border/80 flex flex-col items-center justify-center text-center space-y-3">
            <AlertTriangle className="h-6 w-6 text-muted-foreground/60" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                {!currentBundle ? "Chưa có Bộ Hồ Sơ Mẫu nào để ghép" : "Chưa có Bộ Khách Hàng nào để ghép"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md">
                Hãy kiểm tra hoặc khởi tạo bộ mẫu tại <strong>Tab 2 (Bộ Hồ Sơ Mẫu)</strong> và bộ dữ liệu khách hàng tại <strong>Tab 1 (Hồ Sơ Khách Hàng)</strong> trước khi thực hiện ghép chéo & xuất file.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {!currentBundle && (
                <Button size="sm" variant="outline" onClick={() => onNavigateTab?.("templates")} className="text-xs h-8 px-3">
                  Chuyển sang Tab 2: Bộ Hồ Sơ Mẫu ➔
                </Button>
              )}
              {!currentProfile && (
                <Button size="sm" variant="outline" onClick={() => onNavigateTab?.("profile")} className="text-xs h-8 px-3">
                  Chuyển sang Tab 1: Hồ Sơ Khách Hàng ➔
                </Button>
              )}
            </div>
          </div>
        ) : missingFields.length === 0 ? (
          <div className="p-4 rounded-lg bg-background border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 rounded-full bg-foreground text-background items-center justify-center shrink-0">
                ✓
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground">Sẵn sàng điền tự động 100%!</h4>
                <p className="text-[11px] text-muted-foreground">
                  Bộ Khách Hàng &quot;<strong>{currentProfile?.name}</strong>&quot; đã có đủ dữ liệu cho toàn bộ {requiredFieldsInfo.length} từ khóa của bộ mẫu này.
                </p>
              </div>
            </div>
            <Button
              onClick={runActualFillProcess}
              disabled={isProcessing}
              className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-5 py-2 h-9 text-xs rounded-md shadow-2xs gap-2 shrink-0"
            >
              {isProcessing ? "Đang điền hồ sơ..." : "ĐIỀN TỰ ĐỘNG VÀO TẤT CẢ"}
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Phát hiện từ khóa còn thiếu (Delta): Bộ Khách Hàng &quot;{currentProfile?.name}&quot; đang thiếu {missingFields.length} trường
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vui lòng nhập nhanh bổ sung ngay dưới đây. Bạn có thể lưu thẳng vào bộ hiện tại hoặc nhân bản ra bộ mới (VD: Khách hàng B&apos;).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {missingFields.map((item) => (
                <div key={item.key} className="p-2.5 rounded-md bg-background border border-border/60 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-foreground truncate" title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/40 text-muted-foreground shrink-0 border border-border/30">
                      {item.placeholder}
                    </span>
                  </div>
                  <Input
                    value={deltaInputs[item.key] || ""}
                    onChange={(e) => setDeltaInputs((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    placeholder="Nhập bổ sung..."
                    className="h-7 text-xs bg-background border-border/60 rounded focus-visible:ring-1 focus-visible:ring-foreground font-medium"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
              <Button
                variant="outline"
                onClick={handleUpdateAndFillCurrent}
                disabled={isProcessing}
                className="h-8 text-xs font-medium border-border/80 bg-background hover:bg-muted text-foreground rounded-md gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Lưu thẳng vào bộ &quot;{currentProfile?.name}&quot; & Điền ngay
              </Button>
              <Button
                onClick={handleDuplicateAndFillNew}
                disabled={isProcessing}
                className="h-8 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-md shadow-2xs gap-1.5"
              >
                <ArrowRight className="h-3.5 w-3.5" /> Nhân bản thành Bộ mới (B&apos;) & Điền ngay
              </Button>
            </div>
          </div>
        )}
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
