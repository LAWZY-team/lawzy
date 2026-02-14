"use client"

import { useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { FileText, Info, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import { useEditorStore } from '@/stores/editor-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import contractsData from '@/mock/contracts.json'
import mergeFieldsData from '@/mock/merge-fields.json'
import { toast } from 'sonner'

interface RightPanelProps {
  editor: Editor | null
  onClose?: () => void
}

type MergeFieldItem = { key: string; label: string; value: string }

export function RightPanel({ editor, onClose }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('fields')
  const { currentDocumentId, metadata, templateMergeFields, mergeFieldValues, updateMergeFieldValue } = useEditorStore()
  const { customFields, addCustomField } = useUserFieldsStore()
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldDefault, setNewFieldDefault] = useState('')

  const currentContract = contractsData.contracts.find(c => c.contractId === currentDocumentId)

  // Danh sách trường: từ contract hoặc template; giá trị đọc/ghi từ store (mergeFieldValues)
  const baseMergeFields: MergeFieldItem[] = currentContract
    ? Object.keys(currentContract.mergeFieldValues || {}).map((key) => {
        let label = key
        for (const cat of mergeFieldsData.categories) {
          const field = cat.fields.find(f => f.key.replace(/{{|}}/g, '') === key || f.key === `{{${key}}}`)
          if (field) {
            label = field.label
            break
          }
        }
        const contractValues = currentContract.mergeFieldValues as unknown as Record<string, string> | undefined
        return { key, label, value: mergeFieldValues[key] ?? contractValues?.[key] ?? '' }
      })
    : (templateMergeFields ?? []).map((f) => ({
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

  const insertField = (field: MergeFieldItem) => {
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

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background text-foreground border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-background">
        <h3 className="font-semibold text-sm">Công cụ</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent">
            <X className="w-4 h-4" />
          </Button>
        )}
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
                <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Danh sách trường dữ liệu</h4>
                <p className="text-[11px] text-muted-foreground/70">Nhấn tên trường hoặc + để chèn vào văn bản. Sửa giá trị bên dưới.</p>
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
                        className="text-xs font-medium text-blue-400 group-hover:text-blue-300 cursor-pointer truncate flex-1 min-w-0"
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
                      value={mergeFieldValues[field.key] ?? field.value}
                      onChange={(e) => updateMergeFieldValue(field.key, e.target.value)}
                      className="h-7 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground"
                      placeholder="Giá trị"
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
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thông tin chung</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tên hợp đồng</Label>
                  <Input defaultValue={metadata.title || "Hợp đồng dịch vụ CNTT"} className="bg-background border-border" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 capitalize">
                      {currentContract?.status || "draft"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Người tạo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      {currentContract?.createdBy ? "U" : "L"}
                    </div>
                    <span className="text-sm text-foreground">{currentContract?.createdBy || "Luật sư Admin"}</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lịch sử phiên bản</h4>
                <div className="space-y-3">
                  {[
                    { ver: 'v1.2', time: 'Vừa xong', user: 'AI Assistant' },
                    { ver: 'v1.1', time: '10 phút trước', user: 'Bạn' },
                    { ver: 'v1.0', time: '15 phút trước', user: 'Hệ thống' },
                  ].map((ver, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{ver.ver}</span>
                        <span className="text-foreground">{ver.user}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{ver.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
