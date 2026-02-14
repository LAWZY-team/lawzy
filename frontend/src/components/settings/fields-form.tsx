"use client"

import { useMemo, useState } from "react"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"

import { useUserFieldsStore } from "@/stores/user-fields-store"

export function FieldsForm() {
  const {
    customFields,
    hiddenFieldKeys,
    addCustomField,
    updateCustomField,
    removeCustomField,
    hideAll,
    showAll,
    toggleHiddenFieldKey,
  } = useUserFieldsStore()

  const [newLabel, setNewLabel] = useState("")
  const [newDefault, setNewDefault] = useState("")

  const customKeys = useMemo(() => customFields.map((f) => f.key), [customFields])

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) {
      toast.error("Vui lòng nhập tên nhãn.")
      return
    }
    const key = addCustomField({ label, defaultValue: newDefault })
    setNewLabel("")
    setNewDefault("")
    toast.success(`Đã thêm trường: ${key}`)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Trường riêng của bạn</h4>
        <p className="text-sm text-muted-foreground">
          Các trường này sẽ xuất hiện trong Editor (Công cụ → Dữ liệu) và có thể được ẩn/hiện khi xuất file.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => hideAll(customKeys)} disabled={customKeys.length === 0}>
          <EyeOff className="h-4 w-4 mr-2" />
          Ẩn tất cả
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => showAll()} disabled={customKeys.length === 0}>
          <Eye className="h-4 w-4 mr-2" />
          Hiện tất cả
        </Button>
      </div>

      <div className="grid gap-3">
        {customFields.length === 0 ? (
          <div className="text-sm text-muted-foreground">Chưa có trường nào. Hãy thêm bên dưới.</div>
        ) : (
          customFields.map((f) => {
            const isHidden = hiddenFieldKeys.includes(f.key)
            return (
              <Card key={f.key} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Key</Label>
                      <div className="text-sm font-mono break-all">{f.key}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Nhãn</Label>
                        <Input
                          value={f.label}
                          onChange={(e) => updateCustomField(f.key, { label: e.target.value })}
                          placeholder="Tên công ty"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Giá trị mặc định</Label>
                        <Input
                          value={f.defaultValue}
                          onChange={(e) => updateCustomField(f.key, { defaultValue: e.target.value })}
                          placeholder="VD: Công ty ABC"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={isHidden} onCheckedChange={() => toggleHiddenFieldKey(f.key)} />
                        <span className="text-sm">Ẩn khi hiển thị/xuất file</span>
                      </div>
                    </div>
                  </div>

                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(f.key)} className="shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Thêm trường mới</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nhãn</Label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Mã số thuế" />
          </div>
          <div className="space-y-1.5">
            <Label>Giá trị mặc định</Label>
            <Input value={newDefault} onChange={(e) => setNewDefault(e.target.value)} placeholder="0101234567" />
          </div>
        </div>
        <Button type="button" onClick={handleAdd}>
          Thêm trường
        </Button>
      </div>
    </div>
  )
}

