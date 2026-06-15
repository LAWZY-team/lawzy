"use client"

import { useState, useMemo } from "react"
import { Cloud, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const [search, setSearch] = useState("")
  const [planFilter, setPlanFilter] = useState<string>("all")
  const { data, isLoading } = useAdminStorageOverview({ fromR2 })

  const breakdown = useMemo(() => data?.breakdown ?? [], [data?.breakdown])

  const filteredBreakdown = useMemo(() => {
    let result = breakdown
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(
        (r) =>
          r.workspaceName.toLowerCase().includes(q) ||
          (r.workspaceId ?? "").toLowerCase().includes(q)
      )
    }
    if (planFilter && planFilter !== "all") {
      result = result.filter((r) => (r.plan ?? "").toLowerCase() === planFilter.toLowerCase())
    }
    return result
  }, [breakdown, search, planFilter])

  const planOptions = useMemo(() => {
    const plans = breakdown.map((r) => r.plan ?? "").filter(Boolean)
    return Array.from(new Set(plans)).sort()
  }, [breakdown])

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
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

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common_search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("admin_storage_plan")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin_users_all")}</SelectItem>
            {planOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
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
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filteredBreakdown.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  {search || planFilter !== "all"
                    ? t("common_no_results")
                    : t("admin_storage_empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredBreakdown.map((row) => (
                <TableRow key={row.workspaceId}>
                  <TableCell className="font-medium">
                    {row.workspaceName}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{row.plan ?? "—"}</span>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
