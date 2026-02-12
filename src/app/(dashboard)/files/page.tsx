"use client"

import { useState } from "react"
import { FileIcon, MoreVertical, Trash2, Download, Search, UploadCloud, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import filesData from "@/mock/files.json"
import usersData from "@/mock/users.json"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [files, setFiles] = useState(filesData.files)

  const currentUser = usersData.users[0]
  const quota = currentUser.quota
  const storagePercent = quota.storageLimit > 0 ? (quota.storageUsed / quota.storageLimit) * 100 : 0

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = (fileId: string) => {
    setFiles(files.filter((f) => f.id !== fileId))
    toast.success("Đã xóa tập tin")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý tập tin</h2>
          <p className="text-muted-foreground">
            Quản lý dung lượng và các tập tin đã tải lên
          </p>
        </div>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" />
          Tải lên
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Dung lượng đã dùng
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {formatBytes(quota.storageUsed)} / {formatBytes(quota.storageLimit)}
          </span>
        </CardHeader>
        <CardContent>
          <Progress value={storagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Gói {quota.subscriptionPlan} · Bao gồm tập tin và tài liệu
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tập tin..."
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
            {filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                  {searchQuery ? "Không tìm thấy tập tin nào" : "Chưa có tập tin nào được tải lên"}
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
                  <TableCell className="max-w-[200px] truncate" title={file.type}>
                    {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(file.uploadDate), {
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
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Tải xuống
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa
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
