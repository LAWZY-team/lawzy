"use client"

import { useState } from "react"
import { HardDrive, Database, Cloud } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminStorageOverview } from "@/hooks/admin/use-admin-storage"
import { useT } from "@/components/i18n-provider"

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function AdminStoragePage() {
  const { t } = useT()
  const [fromR2, setFromR2] = useState(false)
  const { data, isLoading } = useAdminStorageOverview({ fromR2 })

  const totalUsed = data?.totalUsed ?? 0
  const breakdown = data?.breakdown ?? []

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin_storage_title")}
          </h2>
          <p className="text-muted-foreground">{t("admin_storage_desc")}</p>
        </div>
        <Button
          variant={fromR2 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setFromR2(!fromR2)}
          className="gap-1.5"
        >
          <Cloud className="h-4 w-4" />
          {fromR2 ? t("admin_storage_from_r2_on") : t("admin_storage_from_r2_off")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              {t("admin_storage_total_used")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatBytes(totalUsed)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromR2 ? t("admin_storage_r2_list") : t("admin_storage_s3_source")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t("admin_storage_workspaces")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{breakdown.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("admin_storage_by_workspace")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin_storage_breakdown")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("admin_storage_breakdown_desc")}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("admin_storage_empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin_storage_workspace")}</TableHead>
                  <TableHead>{t("admin_storage_plan")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin_storage_used")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("admin_storage_limit")}
                  </TableHead>
                  <TableHead className="w-[180px]">
                    {t("admin_storage_usage")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row) => (
                  <TableRow key={row.workspaceId}>
                    <TableCell className="font-medium">
                      {row.workspaceName}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{row.plan}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBytes(row.storageUsed)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBytes(row.storageLimit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(row.percent, 100)}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {row.percent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
