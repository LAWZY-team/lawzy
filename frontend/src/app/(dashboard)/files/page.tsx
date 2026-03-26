"use client"

import { Suspense, useState } from "react"
import { FileIcon, MoreVertical, Trash2, Download, Search, HardDrive, ChevronLeft, ChevronRight } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFiles, useDeleteFile } from "@/hooks/files/use-files"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useWorkspace } from "@/hooks/workspaces/use-workspaces"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"
import { fixMojibake } from "@/lib/fix-mojibake"
import { QuotaCard } from "@/components/dashboard/quota-card"
import { ReferralCard } from "@/components/dashboard/referral-card"
import { useDashboardQuota } from "@/hooks/dashboard/use-dashboard"
import { DASHBOARD_GRID_QUOTA } from "@/components/dashboard/dashboard-card.styles"
import { ScrollArea } from "@/components/ui/scroll-area"

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const PAGE_SIZE = 20

function FilesPageContent() {
  const { t } = useT()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [filterByUserId, setFilterByUserId] = useState<string>("")
  const { currentWorkspace } = useWorkspaceStore()
  const workspaceId = currentWorkspace?.id ?? ""
  const documentId = searchParams.get("documentId") || undefined
  const category =
    (searchParams.get("category") as "input_upload" | "template" | "export_output" | null) ||
    undefined

  const { data, isLoading } = useFiles(workspaceId, {
    page,
    limit: PAGE_SIZE,
    filterByUserId: filterByUserId || undefined,
    documentId,
    category,
  })
  const { data: workspace } = useWorkspace(workspaceId)
  const deleteMutation = useDeleteFile()
  const { data: quota, isLoading: isQuotaLoading } = useDashboardQuota()

  const files = data?.data ?? []
  const total = data?.total ?? 0
  const hasWorkspace = !!workspaceId
  const members = workspace?.members ?? []

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Đã xóa tập tin")
    } catch {
      toast.error("Không thể xóa tập tin")
    }
  }

  const handleDownload = (id: string, name: string) => {
    const link = document.createElement("a")
    link.href = `/api/proxy/files/${id}/download`
    link.download = fixMojibake(name)
    link.click()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const handleFilterChange = (value: string) => {
    setFilterByUserId(value === "all" ? "" : value)
    setPage(1)
  }

  if (!hasWorkspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <HardDrive className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{t("files_title")}</h2>
        <p className="text-muted-foreground text-center max-w-md">{t("workspace_select_hint")}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("files_title")}</h2>
        <p className="text-muted-foreground">{t("files_subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common_search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterByUserId || "all"} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[200px]" size="sm">
            <SelectValue placeholder={t("files_filter_uploader")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("files_filter_all")}</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("files_table_name")}</TableHead>
              <TableHead>{t("files_table_size")}</TableHead>
              <TableHead>{t("files_table_type")}</TableHead>
              <TableHead>{t("files_uploader")}</TableHead>
              <TableHead>{t("files_table_uploaded_at")}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                  {searchQuery ? t("files_not_found") : t("files_empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-muted rounded-md">
                        <FileIcon className="h-4 w-4 text-blue-500" />
                      </div>
                      <span title={fixMojibake(file.name)}>{fixMojibake(file.name)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={file.mimeType}>
                    {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {file.user?.name ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file.id, file.name)}>
                          <Download className="mr-2 h-4 w-4" />
                          {t("common_download")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("files_pagination", { start, end, total })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            > 
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </ScrollArea>
  )
}

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <FilesPageContent />
    </Suspense>
  )
}
