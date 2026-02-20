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
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentDocs } from "@/components/dashboard/recent-docs"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { StatsByWorkspace } from "@/components/dashboard/stats-by-workspace"
import { useAuthStore } from "@/stores/auth-store"
import { useWorkspaceStore, type Workspace } from "@/stores/workspace-store"
import workspacesData from "@/mock/workspaces.json"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardPeriod } from "@/components/dashboard/overview-chart"

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  week: "Tuần này",
  month: "Tháng nay",
  year: "Năm nay",
}

export default function DashboardPage() {
  useAuthStore()
  const { setCurrentWorkspace, setWorkspaces } = useWorkspaceStore()
  const [period, setPeriod] = useState<DashboardPeriod>("year")

  useEffect(() => {
    const workspaces = workspacesData.workspaces as unknown as Workspace[]
    setWorkspaces(workspaces)
    if (workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [setWorkspaces, setCurrentWorkspace])

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0 px-6">
        <div className="flex items-center gap-4 px-0 pt-6 pb-2 shrink-0 flex-wrap">
          <h2 className="text-3xl font-bold tracking-tight shrink-0">Dashboard</h2>
          <TabsList className="shrink-0">
            <TabsTrigger value="docs">Tài liệu</TabsTrigger>
            <TabsTrigger value="storage">Dung lượng</TabsTrigger>
            <TabsTrigger value="quota">Quota</TabsTrigger>
          </TabsList>
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[140px] shrink-0 ml-auto">
              <SelectValue placeholder="Kỳ" />
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
            <StatsCards />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-4 py-3 gap-1.5 self-start">
                <CardHeader className="pb-0 pt-0 px-4">
                  <CardTitle className="text-sm">Văn bản theo kỳ</CardTitle>
                  <CardDescription className="text-xs">{PERIOD_LABELS[period]}</CardDescription>
                </CardHeader>
                <CardContent className="ps-2 pt-0 px-4 pb-2">
                  <div className="text-foreground [&_text]:fill-current">
                    <OverviewChart period={period} height={160} />
                  </div>
                </CardContent>
              </Card>
              <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <QuickActions />
                <StatsByWorkspace />
              </div>
            </div>
            <RecentDocs />
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
