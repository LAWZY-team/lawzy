"use client"

import { FileText, FileCheck, FileEdit, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard"
import { useT } from "@/components/i18n-provider"

export function StatsCards() {
  const { data, isLoading } = useDashboardOverview()
  const { t } = useT()

  const cards = [
    {
      title: t("dash_total_docs"),
      value: data?.totalDocuments ?? 0,
      sub: t("dash_contracts_in_ws"),
      icon: FileText,
    },
    {
      title: t("dash_completed"),
      value: data?.completedDocuments ?? 0,
      sub: t("dash_effective_docs"),
      icon: FileCheck,
    },
    {
      title: t("dash_drafting"),
      value: data?.draftDocuments ?? 0,
      sub: t("dash_drafts"),
      icon: FileEdit,
    },
    {
      title: t("dash_total_files"),
      value: data?.totalFiles ?? 0,
      sub: t("dash_uploaded_files"),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{item.value}</div>
            )}
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
