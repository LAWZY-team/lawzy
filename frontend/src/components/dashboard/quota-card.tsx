"use client"

import Link from "next/link"
import { Zap, HardDrive, ArrowUpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard"
import { usePlans } from "@/hooks/plans/use-plans"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { useT } from "@/components/i18n-provider"
import { formatStorageDisplay } from "@/types/plan"

const DEFAULT_STORAGE_LIMIT = 1 * 1024 * 1024 * 1024 // 1 GB (MVP free plan)

type QuotaCardVariant = "all" | "quota" | "storage"

export function QuotaCard({ show = "all" }: { show?: QuotaCardVariant }) {
  const { data, isLoading } = useDashboardOverview()
  const { data: plans } = usePlans()
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)
  const { t } = useT()
  const storageUsed = data?.storageUsed ?? 0
  const planSlug = currentWorkspace?.plan ?? "free"
  const plan = plans?.find((p) => p.slug === planSlug)
  const storageLimit =
    (plan?.quotaLimits as { storageBytes?: number } | null)?.storageBytes ??
    DEFAULT_STORAGE_LIMIT
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0
  const totalDocs = data?.totalDocuments ?? 0

  return (
    <>
      {(show === "all" || show === "quota") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dash_ai_credit")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">
                    {data?.aiCreditsUsed ?? 0} / {data?.aiCreditsLimit ?? 100} {t("dash_ai_credit_used")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("dash_ai_credit_remaining", { n: data?.aiCreditsRemaining ?? 100 })}
                </p>
                {data?.nextRenewalAt && (
                  <p className="text-xs text-muted-foreground">
                    {t("dash_credit_renew_every", { n: data?.aiCreditsRenewalDays ?? 30 })}
                    <br />
                    {t("dash_next_renewal")}: {new Date(data.nextRenewalAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalDocs}</span> {t("dash_total_docs_created")} &bull;{" "}
                    <span className="font-semibold text-foreground">{data?.totalFiles ?? 0}</span> {t("dash_files")} &bull;{" "}
                    <span className="font-semibold text-foreground">{data?.totalSources ?? 0}</span> {t("dash_sources")}
                  </p>
                  <Link
                    href="/payment"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {t("sidebar_payment")}
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {(show === "all" || show === "storage") && (
        <Card>
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
