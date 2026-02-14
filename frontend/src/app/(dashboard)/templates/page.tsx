"use client"

import { useState, useMemo } from "react"
import { TemplateGrid } from "@/components/templates/template-grid"
import { TemplateFilters } from "@/components/templates/template-filters"
import { TemplateDetailSplit } from "@/components/templates/template-detail-split"
import { Modal } from "@/components/ui/modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import templatesData from "@/mock/templates.json"
import type { Template } from "@/types/template"

const templates = templatesData.templates as Template[]

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedSort, setSelectedSort] = useState("popular")
  const [viewMode, setViewMode] = useState<"card" | "list">("card")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates]

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((t) => t.type === selectedType)
    }

    switch (selectedSort) {
      case "popular":
        filtered.sort((a, b) => b.popularity - a.popularity)
        break
      case "recent":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "az":
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "za":
        filtered.sort((a, b) => b.title.localeCompare(a.title))
        break
    }

    return filtered
  }, [searchQuery, selectedType, selectedSort])

  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 p-6">
      <div className="shrink-0 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Mẫu hợp đồng</h2>
        <p className="text-muted-foreground">
          Thư viện {templates.length} mẫu hợp đồng có sẵn
        </p>
      </div>

      <div className="shrink-0 mb-4">
        <TemplateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedSort={selectedSort}
          onSortChange={setSelectedSort}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-semibold">Không tìm thấy mẫu hợp đồng</p>
            <p className="text-sm text-muted-foreground mt-2">
              Thử thay đổi bộ lọc hoặc tìm kiếm khác
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground shrink-0 mb-2">
              Tìm thấy {filteredTemplates.length} mẫu hợp đồng
            </p>
            <ScrollArea className="flex-1 min-h-0">
              <TemplateGrid templates={filteredTemplates} onViewTemplate={handleViewTemplate} viewMode={viewMode} />
            </ScrollArea>
          </>
        )}
      </div>

      <Modal
        open={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        size="full"
        showCloseButton={false}
        title={selectedTemplate?.title}
      >
        {selectedTemplate && (
          <TemplateDetailSplit
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </Modal>
    </div>
  )
}
