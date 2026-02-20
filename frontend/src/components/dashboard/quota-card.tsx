"use client"

import { Zap, HardDrive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard"
import { useT } from "@/components/i18n-provider"

const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024 // 100 GB (S3 plan)

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
  const { data, isLoading } = useDashboardOverview()
  const { t } = useT()
  const storageUsed = data?.storageUsed ?? 0
  const storagePercent = STORAGE_LIMIT > 0 ? (storageUsed / STORAGE_LIMIT) * 100 : 0
  const totalDocs = data?.totalDocuments ?? 0

  return (
    <>
      {(show === "all" || show === "quota") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dash_usage_stats")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{totalDocs}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("dash_total_docs_created")}
                </p>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{data?.totalFiles ?? 0}</span> {t("dash_files")} &bull;{" "}
                    <span className="font-semibold text-foreground">{data?.totalSources ?? 0}</span> {t("dash_sources")}
                  </p>
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
                  <span className="font-bold">{formatBytes(storageUsed)}</span>
                  <span className="text-muted-foreground">/ {formatBytes(STORAGE_LIMIT)}</span>
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
