"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAutofillStore } from "@/stores/autofill-store"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { guessCanonicalMapping } from "@/lib/autofill/placeholder-detector"
import { Trash2, Plus, Eye, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface AutofillLiveEditorModalProps {
  isOpen: boolean
  onClose: () => void
  bundleId: string
  docId: string
}

export function AutofillLiveEditorModal({ isOpen, onClose, bundleId, docId }: AutofillLiveEditorModalProps) {
  const { bundles, updateDocInBundle } = useAutofillStore()
  const { customFields } = useUserFieldsStore()
  const [selectedText, setSelectedText] = useState("")

  const doc = useMemo(() => {
    const bundle = bundles.find((b) => b.id === bundleId)
    if (!bundle) return null
    return bundle.documents.find((d) => d.id === docId) || null
  }, [bundles, bundleId, docId])

  if (!doc) return null

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

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-6xl h-[88vh] flex flex-col p-0 overflow-hidden bg-background border border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-base font-bold font-serif text-foreground">{doc.fileName}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5 font-sans">
              Bôi đen (highlight) cụm từ trên bản preview bên trái để tạo mapping hoặc kiểm tra từ khóa.
            </DialogDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8 px-3.5 border-border/80 rounded-md">Đóng & Lưu</Button>
        </div>

        {/* Split Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/60 overflow-hidden">
          {/* Left Preview Pane */}
          <div className="md:col-span-7 flex flex-col min-h-0 bg-muted/20 relative overflow-hidden">
            {selectedText && (
              <div className="absolute top-3 left-3 right-3 z-20 p-3 rounded-lg bg-foreground text-background shadow-xl border border-border flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs truncate">Bôi đen: <strong className="font-mono bg-background/20 px-1.5 py-0.5 rounded text-current">{selectedText}</strong></span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={handleAddFieldFromSelection} className="bg-background text-foreground hover:bg-background/90 font-semibold text-xs h-7 px-3 shadow-2xs rounded-md">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tạo mapping
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedText("")} className="text-background/80 hover:text-background hover:bg-background/10 h-7 text-xs px-2 rounded-md">
                    Bỏ qua
                  </Button>
                </div>
              </div>
            )}

            <div
              onMouseUp={handleTextSelection}
              className="flex-1 overflow-y-auto p-6 md:p-10 font-serif text-sm leading-relaxed text-foreground select-text"
            >
              {doc.previewHtml ? (
                <div
                  className="prose dark:prose-invert max-w-none bg-background p-8 md:p-12 shadow-xs rounded-md border border-border/60 selection:bg-foreground selection:text-background"
                  dangerouslySetInnerHTML={{ __html: doc.previewHtml }}
                />
              ) : doc.plainText ? (
                <div className="bg-background p-8 md:p-12 shadow-xs rounded-md border border-border/60 whitespace-pre-wrap font-mono text-xs selection:bg-foreground selection:text-background">
                  {doc.plainText}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <Eye className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs font-medium">Bản preview chưa sẵn sàng</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="md:col-span-5 flex flex-col min-h-0 bg-background overflow-hidden">
            <div className="p-4 border-b border-border/60 bg-muted/10 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                Danh sách từ khóa ({doc.fields.length})
              </span>
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 font-sans">
                <CheckCircle2 className="h-3.5 w-3.5" /> Tự động khớp
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {doc.fields.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Chưa phát hiện từ khóa placeholder nào.<br />Hãy bôi đen văn bản bên trái để tạo thủ công.
                </div>
              ) : (
                doc.fields.map((field) => (
                  <div key={field.id} className="p-3 rounded-md border border-border/60 bg-background hover:border-foreground/40 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate block">{field.label}</span>
                        <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-foreground mt-0.5 inline-block border border-border/40">
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
                      <span className="text-[11px] text-muted-foreground shrink-0">Ánh xạ về:</span>
                      <select
                        value={field.mappedKey}
                        onChange={(e) => handleUpdateMapping(field.id, e.target.value)}
                        className="h-7 text-xs flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
