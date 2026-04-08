"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database,
  Settings,
  Eye,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, vi } from "date-fns/locale"
import { useT } from "@/components/i18n-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { SourceDetailModal } from "@/components/sources/source-detail-modal"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useAuthStore } from "@/stores/auth-store"
import { useSources, useUploadSource, useDeleteSource } from "@/hooks/sources/use-sources"
import { useLawzyCatalog } from "@/hooks/sources/use-lawzy-catalog"
import { toast } from "sonner"
import { SOURCE_ROW_STATUS_BADGE } from "@/lib/sources/source-row-status"

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  url: "URL",
}

const LAWZY_PAGE_SIZE = 20

const lawzyPlanLabelKey = (access: string): "sources_lawzy_plan_basic" | "sources_lawzy_plan_full" | "sources_lawzy_plan_premium" => {
  if (access === "premium") return "sources_lawzy_plan_premium"
  if (access === "full") return "sources_lawzy_plan_full"
  return "sources_lawzy_plan_basic"
}

export default function SourcesPage() {
  const { t, locale } = useT()
  const dateLocale = locale === "vi" ? vi : enUS
  const { currentWorkspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const workspaceId = currentWorkspace?.id ?? ""
  const isAdmin = user?.roles?.includes("admin") ?? false
  const { data: sourcesData, isLoading } = useSources(workspaceId)
  const uploadMutation = useUploadSource()
  const deleteMutation = useDeleteSource()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [lawzyPage, setLawzyPage] = useState(1)
  const [workspaceDetailId, setWorkspaceDetailId] = useState<string | null>(null)
  const { data: lawzyData, isLoading: lawzyLoading } = useLawzyCatalog(workspaceId, {
    page: lawzyPage,
    limit: LAWZY_PAGE_SIZE,
  })

  const sources = sourcesData?.data ?? []
  const total = sourcesData?.total ?? 0

  const filteredSources = searchQuery
    ? sources.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sources

  const lawzySources = lawzyData?.data ?? []
  const lawzyTotal = lawzyData?.total ?? 0
  const lawzyTotalPages = Math.ceil(lawzyTotal / LAWZY_PAGE_SIZE) || 1
  const systemSourceAccess = lawzyData?.systemSourceAccess ?? "basic"

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf"
    const typeMap: Record<string, string> = { pdf: "pdf", docx: "docx", doc: "docx", txt: "txt" }
    const type = typeMap[ext] || "pdf"
    try {
      await uploadMutation.mutateAsync({
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        type,
        workspaceId,
      })
      toast.success(t("sources_upload_success"))
    } catch {
      toast.error(t("sources_upload_error"))
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t("sources_delete_success"))
      if (workspaceDetailId === id) setWorkspaceDetailId(null)
    } catch {
      toast.error(t("sources_delete_error"))
    }
  }

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("sources_title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("sources_description")}</p>
      </div>

      <SourceDetailModal
        mode="member"
        sourceId={workspaceDetailId}
        open={!!workspaceDetailId}
        onOpenChange={(o) => {
          if (!o) setWorkspaceDetailId(null)
        }}
      />

      <Tabs defaultValue="workspace" className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="workspace">{t("sources_tab_workspace")}</TabsTrigger>
            <TabsTrigger value="lawzy">{t("sources_tab_lawzy")}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workspace" className="mt-0 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("sources_search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {total} {t("sources_count_label")}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending || !workspaceId}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t("sources_upload_btn")}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSources.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("sources_empty_title")}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {t("sources_empty_description")}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("sources_upload_first")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t("sources_lawzy_col_title")}</TableHead>
                    <TableHead>{t("sources_lawzy_col_type")}</TableHead>
                    <TableHead>{t("sources_lawzy_col_status")}</TableHead>
                    <TableHead>{t("sources_lawzy_col_chunks")}</TableHead>
                    <TableHead>{t("sources_lawzy_col_updated")}</TableHead>
                    <TableHead className="w-[100px] text-right">{t("sources_workspace_col_actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSources.map((row) => {
                    const badge =
                      SOURCE_ROW_STATUS_BADGE[row.status] ?? SOURCE_ROW_STATUS_BADGE.pending
                    const tags = row.tags as Record<string, unknown> | undefined
                    const docIdentity = tags?.docIdentity as string | undefined
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => setWorkspaceDetailId(row.id)}
                      >
                        <TableCell>
                          <div className="flex items-start gap-2 min-w-0">
                            {row.type === "url" ? (
                              <Globe className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-md" title={row.title}>
                                {row.title}
                              </p>
                              {docIdentity && (
                                <p className="text-xs text-muted-foreground truncate max-w-md">{docIdentity}</p>
                              )}
                              {row.user?.name && (
                                <p className="text-xs text-muted-foreground">{row.user.name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[row.type] ?? row.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.chunkCount ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true, locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t("sources_workspace_row_view")}
                              onClick={(e) => {
                                e.stopPropagation()
                                setWorkspaceDetailId(row.id)
                              }}
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(row.id)
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lawzy" className="mt-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 max-w-2xl">
              <p className="text-sm text-muted-foreground">{t("sources_lawzy_description")}</p>
              <p className="text-xs text-muted-foreground">{t("sources_lawzy_readonly_hint")}</p>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/sources">
                  <Settings className="h-4 w-4 mr-2" />
                  {t("sources_lawzy_admin_link")}
                </Link>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("sources_lawzy_plan_label")}:</span>
            <Badge variant="secondary">{t(lawzyPlanLabelKey(systemSourceAccess))}</Badge>
          </div>

          {systemSourceAccess !== "premium" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200/90">
              {t("sources_lawzy_upgrade_premium_hint")}
            </div>
          )}

          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{t("sources_lawzy_col_title")}</TableHead>
                  <TableHead>{t("sources_lawzy_col_type")}</TableHead>
                  <TableHead>{t("sources_lawzy_col_scope")}</TableHead>
                  <TableHead>{t("sources_lawzy_col_status")}</TableHead>
                  <TableHead>{t("sources_lawzy_col_chunks")}</TableHead>
                  <TableHead>{t("sources_lawzy_col_updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lawzyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-14" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : lawzySources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 opacity-40" />
                        <p>{t("sources_lawzy_empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lawzySources.map((row) => {
                    const badge =
                      SOURCE_ROW_STATUS_BADGE[row.status] ?? SOURCE_ROW_STATUS_BADGE.pending
                    const tags = row.tags as Record<string, unknown> | undefined
                    const docIdentity = tags?.docIdentity as string | undefined
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-md" title={row.title}>
                              {row.title}
                            </p>
                            {docIdentity && (
                              <p className="text-xs text-muted-foreground truncate max-w-md">{docIdentity}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {row.scope}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.chunkCount ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true, locale: dateLocale })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {lawzyTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={lawzyPage <= 1 || lawzyLoading}
                onClick={() => setLawzyPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {lawzyPage} / {lawzyTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={lawzyPage >= lawzyTotalPages || lawzyLoading}
                onClick={() => setLawzyPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
