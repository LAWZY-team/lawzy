"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export function AppearanceForm() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Giao diện</h4>
        <p className="text-sm text-muted-foreground">
          Giao diện đã được cố định ở chế độ sáng (light mode).
        </p>
      </div>
      <Card className="mt-4 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900">
              Hệ thống hiện tại chỉ hỗ trợ giao diện sáng. Tính năng chuyển đổi
              theme đã bị vô hiệu hóa.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="mt-6">
        <div className="items-center rounded-md border-2 border-primary p-1 max-w-md">
          {/* phần skeleton giữ nguyên như cũ */}
        </div>
        <span className="block w-full p-2 text-center font-normal text-primary">
          Sáng (Đang sử dụng)
        </span>
      </div>
    </div>
  );
}
