"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Info } from "lucide-react"

export function AppearanceForm() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <label className="text-sm font-medium leading-none">Giao diện</label>
        <p className="text-sm text-muted-foreground">
          Giao diện đã được cố định ở chế độ sáng (light mode).
        </p>
        <Card className="mt-4 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-900">
                Hệ thống hiện tại chỉ hỗ trợ giao diện sáng. Tính năng chuyển đổi theme đã bị vô hiệu hóa.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6">
          <div className="items-center rounded-md border-2 border-primary p-1 max-w-md">
            <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
              <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
              <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
              </div>
            </div>
          </div>
          <span className="block w-full p-2 text-center font-normal text-primary">
            Sáng (Đang sử dụng)
          </span>
        </div>
      </div>
    </div>
  )
}
