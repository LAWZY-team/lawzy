"use client"

import * as React from "react"
import { Gift, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"
import { useT } from "@/components/i18n-provider"

export function ReferralCard() {
  const { user } = useAuthStore()
  const [copied, setCopied] = React.useState(false)
  const { t } = useT()

  const referralLink = `https://lawzy.vn/ref/${user?.id?.slice(0, 8) ?? "demo"}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success(t("referral_copied"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("referral_copy_fail"))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t("referral_title")}</CardTitle>
        <Gift className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("dash_share_lawzy")}
          </p>
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
            {t("referral_credits")}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
