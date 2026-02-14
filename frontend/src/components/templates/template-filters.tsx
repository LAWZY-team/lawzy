"use client"

import * as React from "react"
import { Search, LayoutGrid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type TemplateViewMode = "card" | "list"

interface TemplateFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedType: string
  onTypeChange: (type: string) => void
  selectedSort: string
  onSortChange: (sort: string) => void
  viewMode: TemplateViewMode
  onViewModeChange: (mode: TemplateViewMode) => void
}

export function TemplateFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedSort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: TemplateFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
      <div className="flex-1 min-w-[200px] max-w-[320px] space-y-1.5">
        <Label htmlFor="search" className="text-xs">Tìm kiếm</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Tìm theo tên hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="w-[160px] shrink-0 space-y-1.5">
          <Label htmlFor="type" className="text-xs">Loại hợp đồng</Label>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger id="type" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="NDA">NDA</SelectItem>
              <SelectItem value="SaaS">SaaS</SelectItem>
              <SelectItem value="Labor">Lao động</SelectItem>
              <SelectItem value="Sale">Mua bán</SelectItem>
              <SelectItem value="Partnership">Hợp tác</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px] shrink-0 space-y-1.5">
          <Label htmlFor="sort" className="text-xs">Sắp xếp</Label>
          <Select value={selectedSort} onValueChange={onSortChange}>
            <SelectTrigger id="sort" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Phổ biến nhất</SelectItem>
              <SelectItem value="recent">Mới nhất</SelectItem>
              <SelectItem value="az">A-Z</SelectItem>
              <SelectItem value="za">Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-0 pb-0.5">
          <Label className="sr-only">Hiển thị</Label>
          <div className="flex rounded-md border border-input bg-background p-0.5" role="group" aria-label="Chế độ hiển thị">
            <Button
              type="button"
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 gap-1 px-2.5", viewMode === "card" && "shadow-sm")}
              onClick={() => onViewModeChange("card")}
              aria-pressed={viewMode === "card"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Thẻ
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 gap-1 px-2.5", viewMode === "list" && "shadow-sm")}
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-3.5 w-3.5" />
              Danh sách
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
