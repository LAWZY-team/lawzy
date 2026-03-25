"use client"

import Link from "next/link"
import { HardDrive, Zap, FileUp, FolderInput, Library, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n-provider"
import { useDashboardQuota } from "@/hooks/dashboard/use-dashboard"
import { usePlans } from "@/hooks/plans/use-plans"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { formatStorageDisplay } from "@/types/plan"

type BreakdownKey = "input_upload" | "input_source" | "template" | "export_output"

const CAT_META: Record<
  BreakdownKey,
  { title: string; icon: React.ComponentType<{ className?: string }> }
> = {
  input_upload: { title: "Tải lên", icon: FileUp },
  input_source: { title: "Nguồn", icon: FolderInput },
  template: { title: "Mẫu hợp đồng", icon: Library },
  export_output: { title: "File xuất", icon: Download },
}

export default function UsagePage() {
  const { t } = useT()
  const { data: quota, isLoading } = useDashboardQuota()
  const { data: plans } = usePlans()
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace)

  const defaultPlan = plans?.find((p) => p.price === 0)
  const planSlug = currentWorkspace?.plan ?? defaultPlan?.slug ?? plans?.[0]?.slug
  const plan = plans?.find((p) => p.slug === planSlug)
  const defaultStorage =
    (defaultPlan?.quotaLimits as { storageBytes?: number } | null)?.storageBytes ??
    1024 ** 3
  const storageLimit =
    (plan?.quotaLimits as { storageBytes?: number } | null)?.storageBytes ?? defaultStorage

  const storageUsed = quota?.storageUsed ?? 0
  const storagePercent = storageLimit > 0 ? Math.min(100, (storageUsed / storageLimit) * 100) : 0
  const breakdown = quota?.storageBreakdown

  const items: Array<{ key: BreakdownKey; bytes: number; count: number }> = breakdown
    ? (Object.keys(CAT_META) as BreakdownKey[]).map((k) => ({
        key: k,
        bytes: breakdown[k]?.bytes ?? 0,
        count: breakdown[k]?.count ?? 0,
      }))
    : []

  items.sort((a, b) => b.bytes - a.bytes)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("dash_storage_label")}</h2>
          <p className="text-muted-foreground">
            Nắm dung lượng lưu trữ và mức sử dụng AI trong workspace.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/files">Xem danh sách tập tin</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                  <span className="text-muted-foreground">
                    / {formatStorageDisplay(storageLimit, t)}
                  </span>
                </div>
                <Progress value={storagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{t("dash_file_upload_docs")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dash_ai_credit")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {quota?.aiCreditsLimit === -1
                    ? t("dash_ai_credit_unlimited")
                    : `${quota?.aiCreditsUsed ?? 0} / ${quota?.aiCreditsLimit ?? 0}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {quota?.aiCreditsLimit === -1
                    ? t("dash_ai_credit_used")
                    : quota?.aiCreditsRemaining != null && quota.aiCreditsRemaining >= 0
                      ? t("dash_ai_credit_remaining", { n: quota.aiCreditsRemaining })
                      : t("dash_ai_credit_used")}
                </p>
                <Link
                  href="/payment"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Nâng cấp gói để tăng quota
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Phân bổ dung lượng</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !breakdown ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu breakdown.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {items.map((it) => {
                const meta = CAT_META[it.key]
                const Icon = meta.icon
                const percent =
                  storageUsed > 0 ? Math.min(100, (it.bytes / storageUsed) * 100) : 0
                return (
                  <div key={it.key} className="flex items-center gap-3 p-3">
                    <div className="p-2 bg-muted rounded-md">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{meta.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.count} mục · {formatStorageDisplay(it.bytes, t)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {percent.toFixed(0)}%
                        </div>
                      </div>
                      <Progress value={percent} className="h-1.5 mt-2" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

