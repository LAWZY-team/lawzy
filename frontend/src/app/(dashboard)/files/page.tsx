"use client"

import { useRef, useState } from "react"
import { FileIcon, MoreVertical, Trash2, Download, Search, UploadCloud, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useFiles, useUploadFile, useDeleteFile, useStorageUsed } from "@/hooks/files/use-files"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function FilesPage() {
  const { t } = useT()
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { currentWorkspace } = useWorkspaceStore()
  const workspaceId = currentWorkspace?.id ?? ""

  const { data, isLoading } = useFiles(workspaceId, { limit: 100 })
  const { data: storage } = useStorageUsed(workspaceId)
  const uploadMutation = useUploadFile()
  const deleteMutation = useDeleteFile()

  const files = data?.data ?? []
  const storageUsed = storage?.bytes ?? 0
  const storagePercent = STORAGE_LIMIT > 0 ? (storageUsed / STORAGE_LIMIT) * 100 : 0

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workspaceId) return
    try {
      await uploadMutation.mutateAsync({ file, workspaceId })
      toast.success("Đã tải lên thành công")
    } catch {
      toast.error("Tải lên thất bại")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

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
    link.download = name
    link.click()
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("files_title")}</h2>
          <p className="text-muted-foreground">
            {t("files_subtitle")}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? t("common_loading") : t("common_upload")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Dung lượng đã dùng
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {formatBytes(storageUsed)} / {formatBytes(STORAGE_LIMIT)}
          </span>
        </CardHeader>
        <CardContent>
          <Progress value={storagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            S3 Storage · 100 GB
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common_search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên tập tin</TableHead>
              <TableHead>Kích thước</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Ngày tải lên</TableHead>
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
                  <TableCell />
                </TableRow>
              ))
            ) : filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
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
                      <span>{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={file.mimeType}>
                    {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
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
    </div>
  )
}
