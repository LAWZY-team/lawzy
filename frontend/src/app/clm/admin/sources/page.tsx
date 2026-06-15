"use client"

import { useState } from "react"
import {
  RefreshCw,
  Trash2,
  MoreVertical,
  Globe,
  ChevronLeft,
  ChevronRight,
  FileText,
  Database,
  Eye,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { useT } from "@/components/i18n-provider"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import {
  useAdminSources,
  useDeleteAdminSource,
  useReprocessAdminSource,
} from "@/hooks/admin/use-admin-sources"
import type { AdminSource } from "@/hooks/admin/use-admin-sources"
import { CrawlLegalModal } from "@/components/admin/crawl-legal-modal"
import { SourceDetailModal } from "@/components/sources/source-detail-modal"
import { SOURCE_ROW_STATUS_BADGE } from "@/lib/sources/source-row-status"

const SCOPE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "premium", label: "Premium" },
] as const

export default function AdminSourcesPage() {
  const { t } = useT()
  const ALL_VALUE = "__all__"
  const [scopeFilter, setScopeFilter] = useState<string>(ALL_VALUE)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<AdminSource | null>(null)
  const [detailSource, setDetailSource] = useState<AdminSource | null>(null)
  const [crawlOpen, setCrawlOpen] = useState(false)

  const { data, isLoading, refetch } = useAdminSources({
    page,
    limit: 30,
    scope: scopeFilter === ALL_VALUE ? undefined : scopeFilter,
  })
  const deleteMutation = useDeleteAdminSource()
  const reprocessMutation = useReprocessAdminSource()

  const sources = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 30) || 1

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(t("sources_delete_success"))
      setDeleteTarget(null)
    } catch {
      toast.error(t("sources_delete_error"))
    }
  }

  const handleReprocess = async (id: string) => {
    try {
      await reprocessMutation.mutateAsync(id)
      toast.success("Đã bắt đầu xử lý lại")
    } catch {
      toast.error("Lỗi khi xử lý lại")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admin_sources_title")}</h2>
          <p className="text-muted-foreground">{t("admin_sources_desc")}</p>
        </div>
        <Button onClick={() => setCrawlOpen(true)}>
          <Globe className="mr-2 h-4 w-4" />
          {t("admin_sources_crawl_btn")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin_sources_scope")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả</SelectItem>
            {SCOPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground ml-auto">
          {total} {t("sources_count_label")}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Tên nguồn</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
                  <div className="flex flex-col items-center gap-2">
                    <Database className="h-8 w-8 opacity-40" />
                    <p>{t("admin_sources_empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => {
                const badge =
                  SOURCE_ROW_STATUS_BADGE[source.status] ?? SOURCE_ROW_STATUS_BADGE.pending
                const tags = source.tags as Record<string, unknown> | undefined
                const docIdentity = tags?.docIdentity as string | undefined
                return (
                  <TableRow
                    key={source.id}
                    className="cursor-pointer"
                    onClick={() => setDetailSource(source)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-md" title={source.title}>
                            {source.title}
                          </p>
                          {docIdentity && (
                            <p className="text-xs text-muted-foreground">{docIdentity}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{source.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{source.scope}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {source.chunkCount ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(source.updatedAt), { addSuffix: true, locale: vi })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setDetailSource(source)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" /> {t("admin_sources_row_view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReprocess(source.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Xử lý lại
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(source)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xóa nguồn?"
        desc={`Bạn có chắc muốn xóa "${deleteTarget?.title}"? Thao tác này không thể hoàn tác.`}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <SourceDetailModal
        mode="admin"
        source={detailSource}
        open={detailSource !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSource(null)
        }}
      />

      <CrawlLegalModal
        open={crawlOpen}
        onOpenChange={setCrawlOpen}
        onCrawlComplete={() => refetch()}
      />
    </div>
  )
}
