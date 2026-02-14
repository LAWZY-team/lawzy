"use client"

import * as React from "react"
import { Zap, HardDrive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import usersData from "@/mock/users.json"

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

type QuotaCardVariant = "all" | "quota" | "storage"

export function QuotaCard({ show = "all" }: { show?: QuotaCardVariant }) {
  const currentUser = usersData.users[0]
  const q = currentUser.quota
  const dailyUsed = q.dailyLimit - q.dailyRemaining
  const dailyPercent = (dailyUsed / q.dailyLimit) * 100
  const storagePercent = q.storageLimit > 0 ? (q.storageUsed / q.storageLimit) * 100 : 0

  return (
    <>
      {(show === "all" || show === "quota") && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quota sử dụng</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{q.dailyRemaining}</span>
              <Badge variant="secondary" className="capitalize">
                {q.subscriptionPlan}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              còn lại / {q.dailyLimit} yêu cầu hàng ngày
            </p>
            <Progress value={dailyPercent} className="h-2" />
            {q.referralCredits > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{q.referralCredits}</span> credits từ giới thiệu
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}
      {(show === "all" || show === "storage") && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dung lượng</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{formatBytes(q.storageUsed)}</span>
              <span className="text-muted-foreground">/ {formatBytes(q.storageLimit)}</span>
            </div>
            <Progress value={storagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">Tập tin tải lên & tài liệu</p>
          </div>
        </CardContent>
      </Card>
      )}
    </>
  )
}
