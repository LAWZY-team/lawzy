"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { QuotaCard } from "@/components/dashboard/quota-card"
import { ReferralCard } from "@/components/dashboard/referral-card"
// import { QuickActions } from "@/components/dashboard/quick-actions"
// import { RecentDocs } from "@/components/dashboard/recent-docs"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { StatsByWorkspace } from "@/components/dashboard/stats-by-workspace"
import { useAuthStore } from "@/stores/auth-store"
import { useT } from "@/components/i18n-provider"
import { useWorkspaceStore } from "@/stores/workspace-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import type { DashboardPeriod } from "@/components/dashboard/overview-chart"

export default function DashboardPage() {
  useAuthStore()
  const { t } = useT()

  const PERIOD_LABELS: Record<DashboardPeriod, string> = {
    week: t("dash_this_week"),
    month: t("dash_this_month"),
    year: t("dash_this_year"),
  }
  const { fetchWorkspaces } = useWorkspaceStore()
  const [period, setPeriod] = useState<DashboardPeriod>("year")

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0 px-6">
        <div className="flex items-center gap-4 px-0 pt-6 pb-2 shrink-0 flex-wrap">
          <h2 className="text-3xl font-bold tracking-tight shrink-0">Dashboard</h2>
          <TabsList className="shrink-0">
            <TabsTrigger value="docs">{t("dash_documents")}</TabsTrigger>
            <TabsTrigger value="storage">{t("dash_storage")}</TabsTrigger>
            <TabsTrigger value="quota">{t("dash_quota")}</TabsTrigger>
          </TabsList>
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[140px] shrink-0 ml-auto">
              <SelectValue placeholder={t("dash_period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{PERIOD_LABELS.week}</SelectItem>
              <SelectItem value="month">{PERIOD_LABELS.month}</SelectItem>
              <SelectItem value="year">{PERIOD_LABELS.year}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <TabsContent value="docs" className="space-y-4 pt-4 pb-8 mt-0">
            {/* Banner: Bắt đầu tạo hợp đồng */}
            <div className="bg-black rounded-lg p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">Bắt đầu tạo hợp đồng</h3>
              <p className="text-sm text-gray-300 mb-4">
                Tạo hợp đồng mới trong vài giây và bắt đầu quản lý văn bản của bạn
              </p>
              <div className="flex justify-left">
                <Button asChild className="bg-white text-black hover:bg-gray-100">
                  <Link href="/editor/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo hợp đồng mới
                  </Link>
                </Button>
              </div>
            </div>
            <StatsCards />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-4 py-3 gap-1.5 h-full flex flex-col">
                <CardHeader className="pb-0 pt-0 px-4">
                  <CardTitle className="text-sm">{t("dash_chart_title")}</CardTitle>
                  <CardDescription className="text-xs">{PERIOD_LABELS[period]}</CardDescription>
                </CardHeader>
                <CardContent className="ps-2 pt-0 px-4 pb-2 flex-1">
                  <div className="text-foreground [&_text]:fill-current">
                    <OverviewChart period={period} height={160} />
                  </div>
                </CardContent>
              </Card>
              <div className="lg:col-span-4 h-full">
                <StatsByWorkspace />
              </div>
              <Card className="lg:col-span-4 h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Tài liệu gần đây</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="h-auto p-0 text-xs">
                    <Link href="/documents">Xem tất cả</Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Chưa có tài liệu nào
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4 pt-4 pb-8 mt-0">
            <div className="grid gap-4 lg:grid-cols-3">
              <QuotaCard show="storage" />
              <div className="lg:col-span-2">
                <StatsByWorkspace />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quota" className="space-y-4 pt-4 pb-8 mt-0">
            <div className="grid gap-4 lg:grid-cols-2 max-w-2xl">
              <QuotaCard show="quota" />
              <ReferralCard />
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
