"use client"

import { useState } from 'react'
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
import contractsData from '@/mock/contracts.json'
import mergeFieldsData from '@/mock/merge-fields.json'

interface RightPanelProps {
  editor: Editor | null
  onClose?: () => void
}

export function RightPanel({ editor, onClose }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState('fields')
  const { currentDocumentId, metadata, templateMergeFields, mergeFieldValues, updateMergeFieldValue } = useEditorStore()

  const currentContract = contractsData.contracts.find(c => c.contractId === currentDocumentId)

  // Danh sách trường: từ contract hoặc template; giá trị đọc/ghi từ store (mergeFieldValues)
  const mergeFields = currentContract
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

  const insertField = (field: typeof mergeFields[0]) => {
    editor?.chain().focus().insertContent({
      type: 'mergeField',
      attrs: {
        fieldKey: field.key,
        label: field.label,
        value: field.value,
      },
    }).run()
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-[#131314] text-[#E3E3E3] border-l border-[#2D2D2D]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2D2D2D] bg-[#131314]">
        <h3 className="font-semibold text-sm">Công cụ</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-[#9CA3AF] hover:text-white hover:bg-[#2D2D2D]">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tabs — min-h-0 để flex con không tràn */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 px-3 pt-2">
          <TabsList className="w-full bg-[#131314] border border-[#2D2D2D]">
            <TabsTrigger value="fields" className="flex-1 text-xs data-[state=active]:bg-[#2D2D2D] data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Dữ liệu
            </TabsTrigger>
            <TabsTrigger value="metadata" className="flex-1 text-xs data-[state=active]:bg-[#2D2D2D] data-[state=active]:text-white">
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
                <h4 className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">Danh sách trường dữ liệu</h4>
                <p className="text-[11px] text-[#6B7280]">Nhấn tên trường hoặc + để chèn vào văn bản. Sửa giá trị bên dưới.</p>
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
                    className="p-2 min-w-0 bg-[#131314] border-[#2D2D2D] hover:border-[#4A4A4A] cursor-grab active:cursor-grabbing transition-colors group flex flex-col gap-1.5"
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
                        className="h-6 w-6 shrink-0 text-[#9CA3AF] hover:text-white hover:bg-[#2D2D2D]"
                        onClick={() => insertField(field)}
                        title="Chèn trường dữ liệu"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-[#6B7280] font-mono truncate" title={`Key: {{${field.key}}}`}>
                      Key: {`{{${field.key}}}`}
                    </p>
                    <Input
                      value={mergeFieldValues[field.key] ?? field.value}
                      onChange={(e) => updateMergeFieldValue(field.key, e.target.value)}
                      className="h-7 bg-[#1F1F1F] border-[#2D2D2D] text-[#E3E3E3] text-xs placeholder:text-[#6B7280]"
                      placeholder="Giá trị"
                    />
                  </Card>
                ))}
              </div>

              <Separator className="bg-[#2D2D2D] my-2" />

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Thêm trường dữ liệu</h4>
                <div className="space-y-2">
                  <Input placeholder="Tên nhãn (VD: Bên B)" className="bg-[#131314] border-[#2D2D2D] text-sm h-9" />
                  <Input placeholder="Giá trị mặc định" className="bg-[#131314] border-[#2D2D2D] text-sm h-9" />
                  <Button size="sm" className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] text-[#E3E3E3]">Thêm trường</Button>
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
                <h4 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Thông tin chung</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs text-[#9CA3AF]">Tên hợp đồng</Label>
                  <Input defaultValue={metadata.title || "Hợp đồng dịch vụ CNTT"} className="bg-[#131314] border-[#2D2D2D]" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-[#9CA3AF]">Trạng thái</Label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20 capitalize">
                      {currentContract?.status || "draft"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-[#9CA3AF]">Người tạo</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                      {currentContract?.createdBy ? "U" : "L"}
                    </div>
                    <span className="text-sm">{currentContract?.createdBy || "Luật sư Admin"}</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-[#2D2D2D]" />

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Lịch sử phiên bản</h4>
                <div className="space-y-3">
                  {[
                    { ver: 'v1.2', time: 'Vừa xong', user: 'AI Assistant' },
                    { ver: 'v1.1', time: '10 phút trước', user: 'Bạn' },
                    { ver: 'v1.0', time: '15 phút trước', user: 'Hệ thống' },
                  ].map((ver, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{ver.ver}</span>
                        <span className="text-[#E3E3E3]">{ver.user}</span>
                      </div>
                      <span className="text-xs text-[#6B7280]">{ver.time}</span>
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
