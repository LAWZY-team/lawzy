"use client"

import Link from "next/link"
import { FileText, MoreVertical, Plus } from "lucide-react"
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
import contractsData from "@/mock/contracts.json"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export default function DocumentsPage() {
  const contracts = contractsData.contracts

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tài liệu của tôi</h2>
          <p className="text-muted-foreground">
            Quản lý tất cả hợp đồng của bạn
          </p>
        </div>
        <Button asChild>
          <Link href="/editor/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo tài liệu mới
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên tài liệu</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Rủi ro</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                  Chưa có tài liệu nào. Hãy tạo tài liệu đầu tiên của bạn!
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.contractId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Link
                        href={`/editor/${contract.contractId}`}
                        className="hover:underline"
                      >
                        {contract.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{contract.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {contract.status === 'draft' ? 'Nháp' : 
                       contract.status === 'active' ? 'Đang hoạt động' : contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={riskColors[contract.metadata.riskLevel]}
                    >
                      {contract.metadata.riskLevel === 'low' && 'Thấp'}
                      {contract.metadata.riskLevel === 'medium' && 'Trung bình'}
                      {contract.metadata.riskLevel === 'high' && 'Cao'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(contract.updatedAt), {
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
                        <DropdownMenuItem asChild>
                          <Link href={`/editor/${contract.contractId}`}>
                            Mở
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Sao chép</DropdownMenuItem>
                        <DropdownMenuItem>Chia sẻ</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
