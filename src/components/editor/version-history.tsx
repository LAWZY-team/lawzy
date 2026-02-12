"use client"

import * as React from "react"
import { History, RotateCcw } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

// Mock version history
const mockVersions = [
  {
    versionId: 'v3',
    timestamp: '2026-02-08T14:30:00Z',
    author: 'u123',
    authorName: 'Nguyễn Văn A',
    changes: 'Cập nhật điều khoản thanh toán',
  },
  {
    versionId: 'v2',
    timestamp: '2026-02-05T14:15:00Z',
    author: 'u123',
    authorName: 'Nguyễn Văn A',
    changes: 'Bổ sung điều khoản bảo mật',
  },
  {
    versionId: 'v1',
    timestamp: '2026-02-01T10:30:00Z',
    author: 'u123',
    authorName: 'Nguyễn Văn A',
    changes: 'Tạo bản nháp đầu tiên',
  },
]

export function VersionHistory() {
  const handleRestore = (versionId: string) => {
    console.log('Restoring version:', versionId)
    // Restore logic will be implemented
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Lịch sử
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Lịch sử phiên bản</SheetTitle>
          <SheetDescription>
            Xem và khôi phục các phiên bản trước
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)] mt-6">
          <div className="space-y-4">
            {mockVersions.map((version, index) => (
              <div
                key={version.versionId}
                className="flex gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback>
                    {version.authorName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{version.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.timestamp), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                    {index !== 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(version.versionId)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{version.changes}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
