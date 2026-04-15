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
import { useT } from "@/components/i18n-provider"

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
  compact?: boolean
  showViewModeToggle?: boolean
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
  compact = false,
  showViewModeToggle = true,
}: TemplateFiltersProps) {
  const { t } = useT()

  return (
    <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-3", compact && "flex-col items-stretch gap-2")}>
      <div className={cn("flex-1 min-w-[200px] max-w-[320px] space-y-1.5", compact && "min-w-0 max-w-none space-y-1")}>
        <Label htmlFor="search" className="text-xs leading-none">{t("tmpl_comm_search")}</Label>
        <div className="relative">
          <Search className={cn("absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground", compact && "top-2 h-3.5 w-3.5")} />
          <Input
            id="search"
            placeholder={t("tmpl_comm_search_placeholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn("h-9 pl-8", compact && "h-8 pl-7")}
          />
        </div>
      </div>

      <div className={cn("flex items-end gap-2", compact && "grid grid-cols-2 gap-2")}>
        <div className={cn("w-[160px] shrink-0 space-y-1.5", compact && "w-full min-w-0 space-y-1")}>
          <Label htmlFor="type" className="text-xs leading-none">{t("tmpl_system_type")}</Label>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger id="type" className={cn("h-9", compact && "h-8")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tmpl_comm_all")}</SelectItem>
              <SelectItem value="NDA">NDA</SelectItem>
              <SelectItem value="SaaS">SaaS</SelectItem>
              <SelectItem value="Labor">{t("tmpl_system_labor")}</SelectItem>
              <SelectItem value="Sale">{t("tmpl_system_sale")}</SelectItem>
              <SelectItem value="Partnership">{t("tmpl_system_partnership")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={cn("w-[160px] shrink-0 space-y-1.5", compact && "w-full min-w-0 space-y-1")}>
          <Label htmlFor="sort" className="text-xs leading-none">{t("tmpl_comm_sort")}</Label>
          <Select value={selectedSort} onValueChange={onSortChange}>
            <SelectTrigger id="sort" className={cn("h-9", compact && "h-8")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t("tmpl_system_sort_popular")}</SelectItem>
              <SelectItem value="recent">{t("tmpl_comm_sort_recent")}</SelectItem>
              <SelectItem value="az">A-Z</SelectItem>
              <SelectItem value="za">Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showViewModeToggle && (
          <div className={cn("flex items-end gap-0 pb-0.5", compact && "col-span-2 justify-end pb-0")}>
            <Label className="sr-only">{t("tmpl_comm_display")}</Label>
            <div className="flex rounded-md border border-input bg-background p-0.5" role="group" aria-label={t("tmpl_comm_display_mode")}>
              <Button
                type="button"
                variant={viewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-8 gap-1 px-2.5", compact && "h-7 px-2 text-xs", viewMode === "card" && "shadow-sm")}
                onClick={() => onViewModeChange("card")}
                aria-pressed={viewMode === "card"}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {t("tmpl_comm_view_card")}
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={cn("h-8 gap-1 px-2.5", compact && "h-7 px-2 text-xs", viewMode === "list" && "shadow-sm")}
                onClick={() => onViewModeChange("list")}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-3.5 w-3.5" />
                {t("tmpl_comm_view_list")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
