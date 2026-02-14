"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Library, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Thao tác nhanh</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild className="w-full justify-start">
          <Link href="/editor/new">
            <Plus className="mr-2 h-4 w-4" />
            Tạo hợp đồng mới
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/templates">
            <Library className="mr-2 h-4 w-4" />
            Duyệt mẫu hợp đồng
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/workspace">
            <Users className="mr-2 h-4 w-4" />
            Mời thành viên
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
