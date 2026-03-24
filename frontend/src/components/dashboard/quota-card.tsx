"use client"

import Link from "next/link"
import { Zap, HardDrive, ArrowUpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DASHBOARD_CARD_HOVER } from "./dashboard-card.styles"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardQuota } from "@/hooks/dashboard/use-dashboard"
import { usePlans } from "@/hooks/plans/use-plans"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useT } from "@/components/i18n-provider"
import { formatStorageDisplay } from "@/types/plan"

type QuotaCardVariant = "all" | "quota" | "storage"

export function QuotaCard({
  show = "all",
  overview,
  isLoading,
}: {
  show?: QuotaCardVariant
  overview: DashboardQuota | null
  isLoading: boolean
}) {
  const { data: plans } = usePlans()
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)
  const { t } = useT()
  const storageUsed = overview?.storageUsed ?? 0
  const defaultPlan = plans?.find((p) => p.price === 0)
  const planSlug =
    currentWorkspace?.plan ?? defaultPlan?.slug ?? plans?.[0]?.slug
  const plan = plans?.find((p) => p.slug === planSlug)
  const defaultStorage = (defaultPlan?.quotaLimits as { storageBytes?: number } | null)?.storageBytes ?? 1024 ** 3
  const storageLimit =
    (plan?.quotaLimits as { storageBytes?: number } | null)?.storageBytes ??
    defaultStorage
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0

  const cardHoverClass =
    "transition-all duration-200 ease-out hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"

  return (
    <>
      {(show === "all" || show === "quota") && (
        <Card className={cardHoverClass}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dash_ai_credit")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {overview?.aiCreditsLimit === -1 ? (
                    t("dash_ai_credit_unlimited")
                  ) : (
                    `${overview?.aiCreditsUsed ?? 0} / ${overview?.aiCreditsLimit ?? 0}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.aiCreditsLimit === -1
                    ? t("dash_ai_credit_used")
                    : overview?.aiCreditsRemaining != null && overview.aiCreditsRemaining >= 0
                      ? t("dash_ai_credit_remaining", { n: overview.aiCreditsRemaining })
                      : t("dash_ai_credit_used")}
                </p>
                <Link
                  href="/payment"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  {t("sidebar_payment")}
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {(show === "all" || show === "storage") && (
        <Card className={DASHBOARD_CARD_HOVER}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dash_storage_label")}</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">{formatStorageDisplay(storageUsed, t)}</span>
                  <span className="text-muted-foreground">/ {formatStorageDisplay(storageLimit, t)}</span>
                </div>
                <Progress value={storagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{t("dash_file_upload_docs")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
