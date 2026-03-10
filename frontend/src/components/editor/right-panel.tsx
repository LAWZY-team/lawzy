"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import { FileText, Info, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import { useEditorStore } from '@/stores/editor-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'

interface RightPanelProps {
  editor: Editor | null
  onAuthRequired?: () => boolean | void
}

type MergeFieldItem = { key: string; label: string; value: string }

export function RightPanel({ editor, onAuthRequired }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('fields')
  const {
    currentDocumentId,
    metadata,
    templateMergeFields,
    mergeFieldValues,
    updateMergeFieldValue,
    setMergeFieldValues,
  } = useEditorStore()
  const { customFields, addCustomField } = useUserFieldsStore()
  const { isAuthenticated } = useAuthStore()
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldDefault, setNewFieldDefault] = useState('')
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [versions, setVersions] = useState<
    Array<{ id: string; label: string | null; createdAt: string; createdBy: string }>
  >([])
  const [restoring, setRestoring] = useState<string | null>(null)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadVersions = useCallback(() => {
    if (!isAuthenticated || !currentDocumentId) {
      setVersions([])
      return
    }
    api
      .get<Array<{ id: string; label: string | null; createdAt: string; createdBy: string }>>(
        `/documents/${currentDocumentId}/versions`
      )
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]))
  }, [isAuthenticated, currentDocumentId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    const handler = () => loadVersions()
    window.addEventListener('lawzy:refresh-versions', handler)
    return () => window.removeEventListener('lawzy:refresh-versions', handler)
  }, [loadVersions])

  const baseMergeFields: MergeFieldItem[] = (templateMergeFields ?? []).map((f) => ({
    key: f.fieldKey,
    label: f.label,
    value: mergeFieldValues[f.fieldKey] ?? f.sampleValue ?? '',
  }))

  const mergeFields: MergeFieldItem[] = useMemo(() => {
    const list: MergeFieldItem[] = [...baseMergeFields]
    const existing = new Set(list.map((f) => f.key))
    for (const cf of customFields) {
      if (existing.has(cf.key)) continue
      list.push({
        key: cf.key,
        label: cf.label,
        value: mergeFieldValues[cf.key] ?? cf.defaultValue ?? '',
      })
    }
    return list
  }, [baseMergeFields, customFields, mergeFieldValues])

  // Khi đổi tài liệu, reset toàn bộ draftValues để tránh "dính" giá trị cũ sang tài liệu mới
  useEffect(() => {
    setDraftValues({})
  }, [currentDocumentId])

  const insertField = (field: MergeFieldItem) => {
    // Check auth for guest users
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }
    
    editor?.chain().focus().insertContent({
      type: 'mergeField',
      attrs: {
        fieldKey: field.key,
        label: field.label,
        value: field.value,
      },
    }).run()
  }

  const handleAddCustomField = () => {
    // Check auth for guest users
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }

    const label = newFieldLabel.trim()
    if (!label) {
      toast.error('Vui lòng nhập tên nhãn.')
      return
    }
    const defaultValue = newFieldDefault
    const key = addCustomField({ label, defaultValue })
    updateMergeFieldValue(key, defaultValue ?? '')
    setNewFieldLabel('')
    setNewFieldDefault('')
    toast.success('Đã thêm trường dữ liệu')
  }

  const commitFieldValue = (fieldKey: string, value: string) => {
    // Check auth for guest users when updating field values
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }
    updateMergeFieldValue(fieldKey, value)
  }

  // Cập nhật draft + debounce commit vào store để tránh canvas re-render từng phím
  const handleDraftChange = (fieldKey: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [fieldKey]: value,
    }))

    if (debounceTimers.current[fieldKey]) {
      clearTimeout(debounceTimers.current[fieldKey])
    }

    debounceTimers.current[fieldKey] = setTimeout(() => {
      commitFieldValue(fieldKey, value)
    }, 250)
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!isAuthenticated || !currentDocumentId) return
    if (!editor) return

    setRestoring(versionId)
    try {
      const version = await api.get<{
        contentJSON?: Record<string, unknown>
        mergeFieldValues?: Record<string, unknown>
        chatCursorAt?: string | null
      }>(`/documents/${currentDocumentId}/versions/${versionId}`)

      const content = version?.contentJSON
      if (content) {
        editor.commands.setContent(content as unknown as JSONContent)
      }

      const mfv = (version?.mergeFieldValues ?? {}) as Record<string, unknown>
      setMergeFieldValues(
        Object.fromEntries(Object.entries(mfv).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]))
      )

      if (version?.chatCursorAt) {
        const msgs = await api.get<Array<{ id: string; role: string; content: string; createdAt: string }>>(
          `/documents/${currentDocumentId}/chat-messages?to=${encodeURIComponent(version.chatCursorAt)}`
        )
        window.dispatchEvent(new CustomEvent('lawzy:restore-chat', { detail: { messages: msgs } }))
      }

      toast.success('Đã khôi phục phiên bản')
    } catch (e) {
      console.error(e)
      toast.error('Khôi phục phiên bản thất bại')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background text-foreground border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-background">
        <h3 className="font-semibold text-sm">Công Cụ</h3>
      </div>

      {/* Tabs — min-h-0 để flex con không tràn */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-3 pt-2">
          <TabsList className="w-full bg-background border border-border">
            <TabsTrigger value="fields" className="flex-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-foreground">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Dữ liệu
            </TabsTrigger>
            <TabsTrigger value="metadata" className="flex-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-foreground">
              <Info className="w-3.5 h-3.5 mr-1.5" />
              Thông tin
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Dữ liệu — danh sách trường dữ liệu */}
        <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1 min-h-0 px-3 py-2">
            <div className="space-y-2 min-w-0 pr-1">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium text-black uppercase">Danh sách trường dữ liệu</h4>
                <p className="text-sm text-gray-500">Nhấn tên trường hoặc + để chèn vào văn bản. Sửa giá trị bên dưới.</p>
              </div>

              <div className="grid gap-1.5">
                {mergeFields.map((field) => (
                  <Card
                    key={field.key}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/lawzy-merge-field', JSON.stringify({
                        id: field.key,
                        label: field.label,
                        value: mergeFieldValues[field.key] ?? field.value
                      }))
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="p-2 min-w-0 bg-background border-border hover:border-border/80 cursor-grab active:cursor-grabbing transition-colors group flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium text-blue-500 group-hover:text-blue-700 cursor-pointer truncate flex-1 min-w-0"
                        onClick={() => insertField(field)}
                        title="Chèn vào vị trí con trỏ"
                      >
                        {field.label || field.key}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => insertField(field)}
                        title="Chèn trường dữ liệu"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 font-mono truncate" title={`Key: {{${field.key}}}`}>
                      Key: {`{{${field.key}}}`}
                    </p>
                    <Input
                      value={draftValues[field.key] ?? mergeFieldValues[field.key] ?? field.value}
                      onChange={(e) => handleDraftChange(field.key, e.target.value)}
                      onClick={() => {
                        // Check auth when clicking on input
                        if (!isAuthenticated && onAuthRequired) {
                          onAuthRequired()
                        }
                      }}
                      className="h-7 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground"
                      placeholder="Giá trị"
                      readOnly={!isAuthenticated}
                    />
                  </Card>
                ))}
              </div>

              <Separator className="bg-border my-2" />

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thêm trường dữ liệu</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Tên nhãn (VD: Tên công ty)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                  <Input
                    placeholder="Giá trị mặc định"
                    value={newFieldDefault}
                    onChange={(e) => setNewFieldDefault(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleAddCustomField}
                    className="w-full"
                  >
                    Thêm trường
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1 min-h-0 p-3">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-black uppercase">Thông tin chung</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tên hợp đồng</Label>
                  <Input defaultValue={metadata.title || "Hợp đồng dịch vụ CNTT"} className="bg-background border-border" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 capitalize">
                      draft
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Người tạo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      L
                    </div>
                    <span className="text-sm text-foreground">Lawzy</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lịch sử phiên bản</h4>
                {!isAuthenticated ? (
                  <div className="text-sm text-muted-foreground">
                    Đăng nhập để xem và khôi phục phiên bản.
                  </div>
                ) : !currentDocumentId ? (
                  <div className="text-sm text-muted-foreground">
                    Chưa có tài liệu để hiển thị phiên bản.
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Chưa có phiên bản. Dùng menu “Lưu bản nháp” trong editor để tạo phiên bản.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v, idx) => (
                      <Card
                        key={v.id}
                        className="p-3 bg-background border-border flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {v.label || `Phiên bản ${versions.length - idx}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-8"
                          disabled={restoring === v.id}
                          onClick={() => handleRestoreVersion(v.id)}
                          title="Khôi phục phiên bản"
                        >
                          {restoring === v.id ? 'Đang khôi phục...' : 'Khôi phục'}
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
