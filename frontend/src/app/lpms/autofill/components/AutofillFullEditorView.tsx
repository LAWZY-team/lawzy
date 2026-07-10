"use client"

import { useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { guessCanonicalMapping } from "@/lib/autofill/placeholder-detector"
import { Trash2, Plus, Eye, CheckCircle2, ChevronRight, ArrowLeft, FileText } from "lucide-react"
import { toast } from "sonner"

interface AutofillFullEditorViewProps {
  bundleId: string
  docId: string
}

export function AutofillFullEditorView({ bundleId, docId }: AutofillFullEditorViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { bundles, updateDocInBundle } = useAutofillStore()
  const { customFields } = useUserFieldsStore()
  const [selectedText, setSelectedText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const backUrl = pathname.startsWith("/lpms") ? "/lpms/autofill" : "/autofill"

  const bundle = useMemo(() => {
    return bundles.find((b) => b.id === bundleId) || null
  }, [bundles, bundleId])

  const doc = useMemo(() => {
    if (!bundle) return null
    return bundle.documents.find((d) => d.id === docId) || null
  }, [bundle, docId])

  if (!bundle || !doc) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] bg-background text-foreground p-8">
        <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-base font-bold font-serif text-foreground">Không tìm thấy tài liệu này</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Tài liệu hoặc bộ hồ sơ có thể đã bị xóa khỏi hệ thống.
        </p>
        <Button onClick={() => router.push(backUrl)} variant="outline" className="text-xs h-8 px-4 border-border/80">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Quay lại Autofill Hồ Sơ
        </Button>
      </div>
    )
  }

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return doc.fields
    const q = searchQuery.toLowerCase()
    return doc.fields.filter((f) => f.label.toLowerCase().includes(q) || f.placeholder.toLowerCase().includes(q) || f.mappedKey.toLowerCase().includes(q))
  }, [doc.fields, searchQuery])

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    const text = selection.toString().replace(/\s+/g, " ").trim()
    if (text.length >= 2 && text.length <= 120) {
      setSelectedText(text)
    }
  }

  const handleAddFieldFromSelection = () => {
    if (!selectedText) return
    const existing = doc.fields.find((f) => f.placeholder === selectedText)
    if (existing) {
      toast.info("Trường này đã có trong danh sách mapping!")
      return
    }

    const cleanLabel = selectedText.replace(/^[\[\{\<]+|[\]\}\>]+$/g, "").trim() || "Trường mới"
    const mappedKey = guessCanonicalMapping(selectedText)
    const newField = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: cleanLabel,
      placeholder: selectedText,
      mappedKey,
      source: "highlight" as const,
      count: doc.plainText ? (doc.plainText.match(new RegExp(selectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length || 1) : 1
    }

    updateDocInBundle(bundleId, docId, {
      fields: [...doc.fields, newField]
    })
    setSelectedText("")
    toast.success(`Đã thêm trường mapping cho "${selectedText}"!`)
  }

  const handleUpdateMapping = (fieldId: string, mappedKey: string) => {
    updateDocInBundle(bundleId, docId, {
      fields: doc.fields.map((f) => (f.id === fieldId ? { ...f, mappedKey } : f))
    })
  }

  const handleDeleteField = (fieldId: string) => {
    updateDocInBundle(bundleId, docId, {
      fields: doc.fields.filter((f) => f.id !== fieldId)
    })
  }

  const mappedCount = doc.fields.filter((f) => Boolean(f.mappedKey)).length

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background text-foreground overflow-hidden">
      {/* Notion-style Breadcrumb & Header Bar */}
      <div className="px-6 py-3 border-b border-border/60 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto min-w-0 font-sans">
          <Link href={backUrl} className="hover:text-foreground font-medium transition-colors shrink-0">
            Autofill Hồ Sơ
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className="truncate max-w-[160px] sm:max-w-[240px]" title={bundle.name}>
            {bundle.name}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <span className="font-semibold text-foreground font-serif text-sm truncate max-w-[200px] sm:max-w-[320px]" title={doc.fileName}>
            {doc.fileName}
          </span>
          <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/40 shrink-0">
            {mappedCount}/{doc.fields.length} đã khớp
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(backUrl)}
            className="text-xs h-8 px-3.5 border-border/80 hover:bg-muted font-medium rounded-md gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách
          </Button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
        {/* Left Preview Pane (Spacious 7 or 8 columns) */}
        <div className="md:col-span-8 flex flex-col min-h-0 bg-muted/15 relative overflow-hidden">
          {selectedText && (
            <div className="absolute top-4 left-6 right-6 z-20 p-3.5 rounded-xl bg-foreground text-background shadow-2xl border border-border flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-sans truncate">
                  Bôi đen từ khóa: <strong className="font-mono bg-background/20 px-2 py-0.5 rounded text-current ml-1">{selectedText}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={handleAddFieldFromSelection} className="bg-background text-foreground hover:bg-background/90 font-semibold text-xs h-8 px-3.5 shadow-xs rounded-lg">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Tạo mapping
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedText("")} className="text-background/80 hover:text-background hover:bg-background/10 h-8 text-xs px-2.5 rounded-lg">
                  Bỏ qua
                </Button>
              </div>
            </div>
          )}

          <div
            onMouseUp={handleTextSelection}
            className="flex-1 overflow-y-auto p-8 md:p-14 font-serif text-sm leading-relaxed text-foreground select-text"
          >
            {doc.previewHtml ? (
              <div
                className="prose dark:prose-invert max-w-4xl mx-auto bg-background p-10 md:p-16 shadow-xs rounded-lg border border-border/60 selection:bg-foreground selection:text-background"
                dangerouslySetInnerHTML={{ __html: doc.previewHtml }}
              />
            ) : doc.plainText ? (
              <div className="max-w-4xl mx-auto bg-background p-10 md:p-16 shadow-xs rounded-lg border border-border/60 whitespace-pre-wrap font-mono text-xs selection:bg-foreground selection:text-background leading-6">
                {doc.plainText}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-xs font-medium">Bản preview chưa sẵn sàng cho tài liệu này.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel (4 columns) */}
        <div className="md:col-span-4 flex flex-col min-h-0 bg-background overflow-hidden">
          <div className="p-4 border-b border-border/60 bg-muted/10 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                Từ khóa Placeholder ({doc.fields.length})
              </span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 font-sans">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tự động nhận diện
              </span>
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc từ khóa..."
              className="h-8 text-xs bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-foreground rounded-md"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredFields.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted-foreground px-4">
                {searchQuery ? "Không tìm thấy từ khóa phù hợp." : "Chưa phát hiện từ khóa placeholder nào trong file.\nHãy bôi đen (highlight) cụm từ trên bản xem trước bên trái để định nghĩa mapping."}
              </div>
            ) : (
              filteredFields.map((field) => (
                <div key={field.id} className="p-3.5 rounded-lg border border-border/60 bg-background hover:border-foreground/40 transition-colors space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate block" title={field.label}>
                        {field.label}
                      </span>
                      <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/50 text-foreground mt-1 inline-block border border-border/40">
                        {field.placeholder}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-mono">
                        {field.count}x
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => handleDeleteField(field.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground shrink-0 font-sans">Ánh xạ về:</span>
                    <select
                      value={field.mappedKey}
                      onChange={(e) => handleUpdateMapping(field.id, e.target.value)}
                      className="h-7 text-xs flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground font-sans"
                    >
                      <option value="">— Chưa gán (Bỏ qua) —</option>
                      {customFields.map((cf) => (
                        <option key={cf.key} value={cf.key}>
                          {cf.label} ({cf.key})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3.5 border-t border-border/60 bg-muted/10 text-[11px] text-muted-foreground flex items-center justify-between shrink-0 font-sans">
            <span>Mẹo: Bôi đen văn bản bên trái để tạo từ khóa nhanh.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
