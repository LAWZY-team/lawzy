"use client"

import * as React from "react"
import Link from "next/link"
import { FileText, MoreVertical } from "lucide-react"
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

export function RecentDocs() {
  const recentContracts = contractsData.contracts.slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tài liệu gần đây</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/documents">Xem tất cả</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên tài liệu</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Rủi ro</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentContracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chưa có tài liệu nào
                </TableCell>
              </TableRow>
            ) : (
              recentContracts.map((contract) => (
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
