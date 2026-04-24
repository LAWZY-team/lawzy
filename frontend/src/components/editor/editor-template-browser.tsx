"use client"

import * as React from "react"
import { ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { TemplateFilters, type TemplateViewMode } from "@/components/templates/template-filters"
import {
  CommunityTemplateFilters,
  type CommunityFileType,
  type CommunitySort,
} from "@/components/templates/community-template-filters"
import { TemplateGrid } from "@/components/templates/template-grid"
import { CommunityTemplateGrid } from "@/components/templates/community-template-grid"
import { TemplatePreview } from "@/components/templates/template-preview"
import { CommunityTemplateDocumentPreview } from "@/components/templates/community-template-document-preview"
import { useTemplates } from "@/hooks/templates/use-templates"
import { useContractTemplates } from "@/hooks/contract-templates/use-contract-templates"
import {
  getPreviewUrl,
  getStructuredContractTemplate,
  type ContractTemplateFile,
  type ContractTemplateStructured,
} from "@/lib/api/contract-templates"
import type { Template } from "@/types/template"
import { useT } from "@/components/i18n-provider"

type EditorTemplateTab = "system" | "community" | "internal"

type PreviewSelection =
  | {
      kind: "system"
      template: Template
    }
  | {
      kind: "contract"
      file: ContractTemplateFile
      scope: Extract<EditorTemplateTab, "community" | "internal">
    }

interface EditorTemplateBrowserProps {
  onApplySystemTemplate: (templateId: string) => Promise<void> | void
  onApplyContractTemplate: (
    templateId: string,
    scope: Extract<EditorTemplateTab, "community" | "internal">,
  ) => Promise<void> | void
}

const EMPTY_TEMPLATE_VIEW = "h-full w-full p-4"

const matchesCommunityFileType = (fileName: string, type: CommunityFileType): boolean => {
  if (type === "all") return true
  return fileName.toLowerCase().endsWith(`.${type}`)
}

export function EditorTemplateBrowser({
  onApplySystemTemplate,
  onApplyContractTemplate,
}: EditorTemplateBrowserProps) {
  const { t } = useT()
  const [activeTab, setActiveTab] = React.useState<EditorTemplateTab>("system")
  const [selectedPreview, setSelectedPreview] = React.useState<PreviewSelection | null>(null)
  const [applyingKey, setApplyingKey] = React.useState<string | null>(null)
  const [structuredPreview, setStructuredPreview] = React.useState<ContractTemplateStructured | null>(null)
  const [structuredPreviewError, setStructuredPreviewError] = React.useState<string | null>(null)
  const [structuredPreviewLoading, setStructuredPreviewLoading] = React.useState(false)

  const [systemSearchQuery, setSystemSearchQuery] = React.useState("")
  const [systemSelectedType, setSystemSelectedType] = React.useState("all")
  const [systemSelectedSort, setSystemSelectedSort] = React.useState("recent")
  const [systemViewMode, setSystemViewMode] = React.useState<TemplateViewMode>("list")

  const [communitySearch, setCommunitySearch] = React.useState("")
  const [communityFileType, setCommunityFileType] = React.useState<CommunityFileType>("all")
  const [communitySort, setCommunitySort] = React.useState<CommunitySort>("recent")
  const [communityViewMode, setCommunityViewMode] = React.useState<TemplateViewMode>("list")

  const [internalSearch, setInternalSearch] = React.useState("")
  const [internalFileType, setInternalFileType] = React.useState<CommunityFileType>("all")
  const [internalSort, setInternalSort] = React.useState<CommunitySort>("recent")
  const [internalViewMode, setInternalViewMode] = React.useState<TemplateViewMode>("list")

  const { data: systemTemplates = [], isLoading: systemLoading } = useTemplates("system")
  const communityQuery = useContractTemplates("community")
  const internalQuery = useContractTemplates("internal")

  const filteredSystemTemplates = React.useMemo(() => {
    let filtered = [...systemTemplates]
    if (systemSearchQuery.trim()) {
      const query = systemSearchQuery.trim().toLowerCase()
      filtered = filtered.filter((template) =>
        `${template.title} ${template.description ?? ""}`.toLowerCase().includes(query),
      )
    }
    if (systemSelectedType !== "all") {
      filtered = filtered.filter((template) => template.category === systemSelectedType)
    }
    switch (systemSelectedSort) {
      case "recent":
        filtered.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        break
      case "az":
        filtered.sort((left, right) => left.title.localeCompare(right.title))
        break
      case "za":
        filtered.sort((left, right) => right.title.localeCompare(left.title))
        break
      default:
        break
    }
    return filtered
  }, [systemSearchQuery, systemSelectedSort, systemSelectedType, systemTemplates])

  const communityFiles = React.useMemo(
    () => communityQuery.data?.files ?? [],
    [communityQuery.data],
  )
  const internalFiles = React.useMemo(
    () => internalQuery.data?.files ?? [],
    [internalQuery.data],
  )

  const filteredCommunityFiles = React.useMemo(() => {
    let filtered = [...communityFiles]
    if (communitySearch.trim()) {
      const query = communitySearch.trim().toLowerCase()
      filtered = filtered.filter((file) =>
        `${file.name ?? ""} ${file.fileName ?? ""} ${file.description ?? ""}`
          .toLowerCase()
          .includes(query),
      )
    }
    filtered = filtered.filter((file) =>
      matchesCommunityFileType(file.fileName, communityFileType),
    )
    switch (communitySort) {
      case "recent":
        filtered.sort((left, right) =>
          (right.lastModified ?? "").localeCompare(left.lastModified ?? ""),
        )
        break
      case "az":
        filtered.sort((left, right) =>
          (left.name ?? left.fileName).localeCompare(right.name ?? right.fileName),
        )
        break
      case "za":
        filtered.sort((left, right) =>
          (right.name ?? right.fileName).localeCompare(left.name ?? left.fileName),
        )
        break
    }
    return filtered
  }, [communityFileType, communityFiles, communitySearch, communitySort])

  const filteredInternalFiles = React.useMemo(() => {
    let filtered = [...internalFiles]
    if (internalSearch.trim()) {
      const query = internalSearch.trim().toLowerCase()
      filtered = filtered.filter((file) =>
        `${file.name ?? ""} ${file.fileName ?? ""} ${file.description ?? ""}`
          .toLowerCase()
          .includes(query),
      )
    }
    filtered = filtered.filter((file) => matchesCommunityFileType(file.fileName, internalFileType))
    switch (internalSort) {
      case "recent":
        filtered.sort((left, right) =>
          (right.lastModified ?? "").localeCompare(left.lastModified ?? ""),
        )
        break
      case "az":
        filtered.sort((left, right) =>
          (left.name ?? left.fileName).localeCompare(right.name ?? right.fileName),
        )
        break
      case "za":
        filtered.sort((left, right) =>
          (right.name ?? right.fileName).localeCompare(left.name ?? left.fileName),
        )
        break
    }
    return filtered
  }, [internalFileType, internalFiles, internalSearch, internalSort])

  React.useEffect(() => {
    if (selectedPreview?.kind !== "contract") {
      setStructuredPreview(null)
      setStructuredPreviewError(null)
      setStructuredPreviewLoading(false)
      return
    }
    let cancelled = false
    setStructuredPreview(null)
    setStructuredPreviewError(null)
    setStructuredPreviewLoading(true)
    getStructuredContractTemplate({
      id: selectedPreview.file.id,
      scope: selectedPreview.scope,
    })
      .then((template) => {
        if (cancelled) return
        setStructuredPreview(template)
      })
      .catch(() => {
        if (cancelled) return
        setStructuredPreviewError(t("tmpl_structured_load_failed"))
      })
      .finally(() => {
        if (cancelled) return
        setStructuredPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPreview, t])

  const handleApplySelection = async () => {
    if (!selectedPreview) return
    const key =
      selectedPreview.kind === "system"
        ? `system:${selectedPreview.template.id}`
        : `${selectedPreview.scope}:${selectedPreview.file.id}`
    setApplyingKey(key)
    try {
      if (selectedPreview.kind === "system") {
        await onApplySystemTemplate(selectedPreview.template.id)
        return
      }
      await onApplyContractTemplate(selectedPreview.file.id, selectedPreview.scope)
    } finally {
      setApplyingKey(null)
    }
  }

  const renderSystemList = () => {
    if (systemLoading) {
      return (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      )
    }
    if (filteredSystemTemplates.length === 0) {
      return (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
          {t("tmpl_not_found")}
        </div>
      )
    }
    return (
      <TemplateGrid
        templates={filteredSystemTemplates}
        onViewTemplate={(template) => setSelectedPreview({ kind: "system", template })}
        onUseTemplate={(template) => void onApplySystemTemplate(template.id)}
        viewMode={systemViewMode}
        compact
      />
    )
  }

  const renderCommunityList = (
    scope: Extract<EditorTemplateTab, "community" | "internal">,
  ) => {
    const query = scope === "community" ? communityQuery : internalQuery
    const files = scope === "community" ? filteredCommunityFiles : filteredInternalFiles
    const viewMode = scope === "community" ? communityViewMode : internalViewMode
    if (query.isLoading) {
      return (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      )
    }
    if (query.isError) {
      return (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-destructive">
          {t("tmpl_list_load_failed")}
        </div>
      )
    }
    if (files.length === 0) {
      return (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
          {t("tmpl_comm_not_found")}
        </div>
      )
    }
    return (
      <CommunityTemplateGrid
        files={files}
        scope={scope}
        viewMode={viewMode}
        onView={(file) => setSelectedPreview({ kind: "contract", file, scope })}
        onUseFile={(file) => void onApplyContractTemplate(file.id, scope)}
        compact
      />
    )
  }

  const renderPreview = () => {
    if (!selectedPreview) return null
    const previewTitle =
      selectedPreview.kind === "system"
        ? selectedPreview.template.title
        : structuredPreview?.title ?? selectedPreview.file.name ?? selectedPreview.file.fileName
    const previewDescription =
      selectedPreview.kind === "system"
        ? selectedPreview.template.description
        : structuredPreview?.description ?? selectedPreview.file.description
    const previewMetaLabel =
      selectedPreview.kind === "system"
        ? selectedPreview.template.category
        : selectedPreview.scope
    const previewActionKey =
      selectedPreview.kind === "system"
        ? `system:${selectedPreview.template.id}`
        : `${selectedPreview.scope}:${selectedPreview.file.id}`
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setSelectedPreview(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common_back")}
          </Button>
          <Badge variant="secondary" className="capitalize">
            {selectedPreview.kind === 'system' ? t("tmpl_system") : t(`tmpl_${selectedPreview.scope}`)}
          </Badge>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {selectedPreview.kind === "system" ? (
            <TemplatePreview
              contentJSON={selectedPreview.template.contentJSON}
              className={EMPTY_TEMPLATE_VIEW}
            />
          ) : structuredPreviewError ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {structuredPreviewError}
            </div>
          ) : structuredPreviewLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-8 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : (
            <CommunityTemplateDocumentPreview
              fileName={selectedPreview.file.fileName}
              contentJSON={structuredPreview?.contentJSON}
              downloadUrl={getPreviewUrl(selectedPreview.scope, selectedPreview.file.id)}
              loadingMessage={t("tmpl_preview_loading")}
              unsupportedMessage={t("tmpl_preview_not_supported")}
              className="h-full min-h-0"
            />
          )}
        </div>
        <div className="space-y-3 border-t px-3 py-3">
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{previewTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {previewDescription?.trim() || t("tmpl_preview")}
                </p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => void handleApplySelection()}
            disabled={applyingKey === previewActionKey}
          >
            {applyingKey === previewActionKey ? `${t("tmpl_use")}...` : t("tmpl_use_this")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as EditorTemplateTab)
          setSelectedPreview(null)
        }}
        className="flex h-full min-h-0 min-w-0 flex-col"
      >
        <div className="border-b px-3 py-2">
          <TabsList className="w-full min-w-0">
            <TabsTrigger value="system">{t("tmpl_system")}</TabsTrigger>
            <TabsTrigger value="community">{t("tmpl_community")}</TabsTrigger>
            <TabsTrigger value="internal">{t("tmpl_internal")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="system" className="mt-0 flex min-h-0 flex-1 flex-col">
          {selectedPreview ? (
            renderPreview()
          ) : (
            <>
              <div className="border-b px-3 py-2">
                <TemplateFilters
                  searchQuery={systemSearchQuery}
                  onSearchChange={setSystemSearchQuery}
                  selectedType={systemSelectedType}
                  onTypeChange={setSystemSelectedType}
                  selectedSort={systemSelectedSort}
                  onSortChange={setSystemSelectedSort}
                  viewMode={systemViewMode}
                  onViewModeChange={setSystemViewMode}
                  compact
                  showViewModeToggle={false}
                />
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2">
                {renderSystemList()}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        <TabsContent value="community" className="mt-0 flex min-h-0 flex-1 flex-col">
          {selectedPreview ? (
            renderPreview()
          ) : (
            <>
              <div className="border-b px-3 py-2">
                <CommunityTemplateFilters
                  searchQuery={communitySearch}
                  onSearchChange={setCommunitySearch}
                  selectedFileType={communityFileType}
                  onFileTypeChange={setCommunityFileType}
                  selectedSort={communitySort}
                  onSortChange={setCommunitySort}
                  viewMode={communityViewMode}
                  onViewModeChange={setCommunityViewMode}
                  compact
                  showViewModeToggle={false}
                />
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2">
                {renderCommunityList("community")}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        <TabsContent value="internal" className="mt-0 flex min-h-0 flex-1 flex-col">
          {selectedPreview ? (
            renderPreview()
          ) : (
            <>
              <div className="border-b px-3 py-2">
                <CommunityTemplateFilters
                  searchQuery={internalSearch}
                  onSearchChange={setInternalSearch}
                  selectedFileType={internalFileType}
                  onFileTypeChange={setInternalFileType}
                  selectedSort={internalSort}
                  onSortChange={setInternalSort}
                  viewMode={internalViewMode}
                  onViewModeChange={setInternalViewMode}
                  compact
                  showViewModeToggle={false}
                />
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-3 py-2">
                {renderCommunityList("internal")}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
