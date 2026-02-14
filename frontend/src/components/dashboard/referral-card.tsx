"use client"

import * as React from "react"
import { Gift, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"
import usersData from "@/mock/users.json"

export function ReferralCard() {
  const { user } = useAuthStore()
  const [copied, setCopied] = React.useState(false)

  // Find user referral data from mock
  const userData = usersData.users.find((u) => u.userId === user?.userId)
  const referralLink = userData?.referral?.link || "https://lawzy.app/ref/demo"
  const invites = userData?.referral?.invites || 0
  const converted = userData?.referral?.converted || 0

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success("Đã sao chép link giới thiệu!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Không thể sao chép link")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Giới thiệu bạn bè</CardTitle>
        <Gift className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{converted}</p>
              <p className="text-xs text-muted-foreground">chuyển đổi thành công</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-muted-foreground">{invites}</p>
              <p className="text-xs text-muted-foreground">lời mời</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
            />
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nhận 10 credits cho mỗi người bạn đăng ký thành công
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
