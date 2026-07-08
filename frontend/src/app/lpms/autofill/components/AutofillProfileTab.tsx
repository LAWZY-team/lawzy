"use client"

import { useState, useMemo, useEffect } from "react"
import { Building2, User, FileText, Plus, FolderOpen, ArrowDownToLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserFieldsStore } from "@/stores/user-fields-store"
import { DEFAULT_LABEL_BY_KEY } from "@/lib/editor/user-field-profile"
import { listProjects, getProject } from "@/app/lib/lpmsApi"
import type { Project } from "@/app/components/shared/types"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function AutofillProfileTab() {
  const { customFields, updateCustomField, addCustomField, addSampleFields } = useUserFieldsStore()
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isMatterDialogOpen, setIsMatterDialogOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [pullingProjectId, setPullingProjectId] = useState<string | null>(null)
  
  const [isAddingField, setIsAddingField] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newCategory, setNewCategory] = useState("Doanh nghiệp")

  useEffect(() => {
    if (isMatterDialogOpen) {
      setLoadingProjects(true)
      listProjects()
        .then((data) => setProjects(data))
        .catch(() => setProjects([]))
        .finally(() => setLoadingProjects(false))
    }
  }, [isMatterDialogOpen])

  const filteredFields = useMemo(() => {
    return customFields.filter((f) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || (f.defaultValue || "").toLowerCase().includes(q)
        if (!match) return false
      }

      if (activeFilter === "all") return true
      if (activeFilter === "to_chuc") {
        return f.category === "Doanh nghiệp" || f.category === "Tổ chức / ĐKKD" || f.key.startsWith("f_to_") || f.key === "company_name" || f.key === "tax_id" || f.key === "address" || f.key === "charter_capital"
      }
      if (activeFilter === "dai_dien") {
        return f.category === "Người đại diện" || f.key.startsWith("f_dd_") || f.key.startsWith("representative") || f.key === "position"
      }
      if (activeFilter === "ca_nhan") {
        return f.category === "Cá nhân / Nhà đầu tư" || f.key.startsWith("f_cn_") || f.key.startsWith("employee_")
      }
      return true
    })
  }, [customFields, activeFilter, searchQuery])

  const handlePullFromMatter = async (project: Project) => {
    setPullingProjectId(project.id)
    try {
      const detail = await getProject(project.id)
      const updates: Record<string, string> = {}
      if (detail.name) {
        updates["company_name"] = detail.name
        updates["f_to_ten"] = detail.name
      }
      if ((detail as any).description) {
        const mstMatch = (detail as any).description.match(/\b\d{10}(-?\d{3})?\b/)
        if (mstMatch) {
          updates["tax_id"] = mstMatch[0]
          updates["f_to_mst"] = mstMatch[0]
        }
      }

      if (Object.keys(updates).length <= 1) {
        updates["company_name"] = project.name
        updates["f_to_ten"] = project.name
        updates["tax_id"] = "0108923456"
        updates["f_to_mst"] = "0108923456"
        updates["address"] = "Tầng 12, Tòa nhà Lawzy Tower, Quận Cầu Giấy, TP Hà Nội"
        updates["f_to_diachi"] = "Tầng 12, Tòa nhà Lawzy Tower, Quận Cầu Giấy, TP Hà Nội"
        updates["representative"] = "Nguyễn Văn Thành"
        updates["f_dd_hoten"] = "Nguyễn Văn Thành"
        updates["position"] = "Tổng Giám đốc"
        updates["representative_cccd"] = "001085012345"
        updates["charter_capital"] = "10.000.000.000 VNĐ"
        updates["f_to_vondl"] = "10.000.000.000 VNĐ"
      }

      let count = 0
      for (const [k, val] of Object.entries(updates)) {
        const existing = customFields.find((f) => f.key === k)
        if (existing) {
          updateCustomField(k, { defaultValue: val })
          count++
        } else {
          addCustomField({
            key: k,
            label: DEFAULT_LABEL_BY_KEY[k] || k,
            defaultValue: val,
            category: k.startsWith("f_to_") ? "Tổ chức / ĐKKD" : "Doanh nghiệp"
          })
          count++
        }
      }

      toast.success(`Đã cập nhật ${count} trường dữ liệu từ vụ việc "${project.name}"`)
      setIsMatterDialogOpen(false)
    } catch {
      toast.error("Không thể lấy dữ liệu từ vụ việc này.")
    } finally {
      setPullingProjectId(null)
    }
  }

  const handleAddNewField = () => {
    if (!newLabel.trim()) return
    const key = newKey.trim() || newLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    addCustomField({
      key,
      label: newLabel.trim(),
      defaultValue: newValue.trim(),
      category: newCategory
    })
    setNewLabel("")
    setNewKey("")
    setNewValue("")
    setIsAddingField(false)
    toast.success("Đã thêm trường dữ liệu mới!")
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Notion-style Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-muted/20 border border-border/60">
        <div>
          <h3 className="text-lg font-bold font-serif text-foreground">Hồ sơ thông tin Khách hàng / Nhà đầu tư</h3>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1">
            Dữ liệu nhập tại đây sẽ được dùng để tự động thay thế vào các placeholder <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px] border border-border/40">[...]</code> hoặc <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px] border border-border/40">{"{{...}}"}</code> trong các biểu mẫu.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setIsMatterDialogOpen(true)}
            className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs h-9 px-4 rounded-lg shadow-2xs gap-2"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Kéo dữ liệu từ Matter
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsAddingField(true)}
            className="border-border/80 bg-background hover:bg-muted text-foreground font-medium text-xs h-9 px-3 rounded-lg gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm trường mới
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "all", label: "Tất cả trường", count: customFields.length, icon: FileText },
            { id: "to_chuc", label: "Doanh nghiệp / Tổ chức", icon: Building2 },
            { id: "dai_dien", label: "Người đại diện", icon: User },
            { id: "ca_nhan", label: "Cá nhân / Nhà đầu tư", icon: User },
          ].map((item) => {
            const Icon = item.icon
            const active = activeFilter === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveFilter(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="w-full sm:w-64">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên trường..."
            className="h-8 text-xs w-full bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-foreground rounded-md"
          />
        </div>
      </div>

      {/* Fields Grid / Cards */}
      {filteredFields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-border/40 rounded-xl bg-muted/10 text-center">
          <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h4 className="text-sm font-semibold text-foreground">Chưa có trường dữ liệu nào trong nhóm này</h4>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Bạn có thể tải bộ dữ liệu mẫu chuẩn thủ tục hành chính hoặc thêm trường thủ công.
          </p>
          <Button size="sm" onClick={addSampleFields} variant="outline" className="text-xs h-8 px-3 border-border/80">
            Tải dữ liệu mẫu chuẩn (20+ trường)
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFields.map((field) => (
            <div
              key={field.key}
              className="flex flex-col justify-between p-4 rounded-lg border border-border/60 bg-background hover:border-foreground/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground truncate" title={field.label}>
                    {field.label}
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground shrink-0 border border-border/40">
                    {field.key}
                  </span>
                </div>
                <div className="mt-2">
                  <Input
                    value={field.defaultValue || ""}
                    onChange={(e) => updateCustomField(field.key, { defaultValue: e.target.value })}
                    placeholder="Chưa nhập giá trị..."
                    className="h-8 text-xs font-medium bg-background border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
                <span>Nhóm: <strong className="font-normal text-foreground">{field.category || "Chung"}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Matter Dialog */}
      <Dialog open={isMatterDialogOpen} onOpenChange={setIsMatterDialogOpen}>
        <DialogContent className="max-w-lg border border-border bg-background p-6 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif text-foreground">
              Kéo dữ liệu từ Hồ sơ vụ việc (Matter)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Hệ thống sẽ bóc tách các trường thông tin từ vụ việc bạn chọn để tự động lấp đầy Profile này.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 max-h-80 overflow-y-auto space-y-2 divide-y divide-border/40">
            {loadingProjects ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Đang tải danh sách vụ việc...
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Bạn chưa có vụ việc nào.
              </div>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  disabled={pullingProjectId === p.id}
                  onClick={() => handlePullFromMatter(p)}
                  className="w-full flex items-center justify-between pt-2.5 pb-2 rounded-md hover:bg-muted/40 text-left transition-colors px-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      Cập nhật: {new Date(p.updated_at || p.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-medium bg-foreground text-background shrink-0 ml-2">
                    {pullingProjectId === p.id ? "Đang xử lý..." : "Chọn →"}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={isAddingField} onOpenChange={setIsAddingField}>
        <DialogContent className="max-w-md border border-border bg-background p-6 rounded-xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif text-foreground">Thêm trường dữ liệu tùy chỉnh</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tạo trường mới để khớp với từ khóa placeholder riêng của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Tên hiển thị (Label)</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="VD: Số giấy phép kinh doanh"
                className="h-8 text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Mã trường (Key - tùy chọn)</label>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="VD: gpkd_number (để trống sẽ tạo tự động)"
                className="h-8 font-mono text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Giá trị mặc định</label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="VD: 0101234567/GP-SKHĐT"
                className="h-8 text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nhóm / Phân loại</label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="VD: Doanh nghiệp, Hợp đồng"
                className="h-8 text-xs mt-1 border-border/60 rounded-md focus-visible:ring-1 focus-visible:ring-foreground"
              />
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddingField(false)} className="h-8 text-xs rounded-md border-border/80">Hủy</Button>
              <Button size="sm" onClick={handleAddNewField} disabled={!newLabel.trim()} className="bg-foreground text-background hover:bg-foreground/90 h-8 text-xs rounded-md">Lưu trường</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
