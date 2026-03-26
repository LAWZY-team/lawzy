"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { StatsByWorkspace } from "@/components/dashboard/stats-by-workspace"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { useAuthStore } from "@/stores/auth-store"
import { useT } from "@/components/i18n-provider"
import { useDashboardDisplayStore } from "@/stores/dashboard-display-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, FileText } from "lucide-react"
import type { DashboardPeriod } from "@/components/dashboard/overview-chart"
import { useGuestEditorSessionStore } from "@/stores/guest-editor-session-store"
import { useRouter } from "next/navigation"
import { useDashboardInitial } from "@/hooks/dashboard/use-dashboard"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import {
  DASHBOARD_CARD_HOVER,
  DASHBOARD_GRID_CHART,
  DASHBOARD_CARD_ANIMATION,
  DASHBOARD_GRID_QUOTA,
} from "@/components/dashboard/dashboard-card.styles"
import { QuotaCard } from "@/components/dashboard/quota-card"
import { ReferralCard } from "@/components/dashboard/referral-card"
import { useDashboardQuota } from "@/hooks/dashboard/use-dashboard"

export default function DashboardPage() {
  useAuthStore()
  const router = useRouter()
  const { clearSession: clearEditorSession } = useGuestEditorSessionStore()
  const { t } = useT()

  const periodLabels: Record<DashboardPeriod, string> = {
    week: t("dash_this_week"),
    month: t("dash_this_month"),
    year: t("dash_this_year"),
  }
  const [period, setPeriod] = useState<DashboardPeriod>("year")
  const enabledCards = useDashboardDisplayStore((s) => s.enabledCards)
  const { data: initialData, isLoading } = useDashboardInitial(10, period)
  const { data: quota, isLoading: isQuotaLoading } = useDashboardQuota()
  const overview = initialData?.overview ?? null
  const recentDocs = initialData?.recentDocuments ?? null
  const chartData = initialData?.chart ?? null
  const workspaceBreakdownData = initialData?.workspaceBreakdown ?? null

  const statCardsEnabled =
    enabledCards.includes("total_docs") ||
    enabledCards.includes("completed") ||
    enabledCards.includes("drafting") ||
    enabledCards.includes("total_files")
  const chartCardsEnabled =
    enabledCards.includes("chart") ||
    enabledCards.includes("workspace_breakdown") ||
    enabledCards.includes("recent_docs")

    const quotaCardsEnabled =
    enabledCards.includes("ai_quota") ||
    enabledCards.includes("storage") ||
    enabledCards.includes("referral")

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <div className="flex flex-col min-h-0 px-6">
        <div className="flex items-center gap-4 px-0 pt-6 pb-2 shrink-0 flex-wrap">
          <h2 className="text-3xl font-bold tracking-tight shrink-0">
            {t("sidebar_dashboard")}
          </h2>
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[140px] shrink-0 ml-auto">
              <SelectValue placeholder={t("dash_period")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{periodLabels.week}</SelectItem>
              <SelectItem value="month">{periodLabels.month}</SelectItem>
              <SelectItem value="year">{periodLabels.year}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea id="tour-dashboard-stats" className="flex-1 min-h-0 -mx-6 px-6">
          {isLoading ? (
            <div className="pt-4 pb-8">
              <DashboardSkeleton />
            </div>
          ) : (
          <div className={`space-y-4 pt-4 pb-8 ${DASHBOARD_CARD_ANIMATION}`}>
            <div className="bg-black rounded-lg p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">{t("dash_cta_create_title")}</h3>
              <p className="text-sm text-gray-300 mb-4">{t("dash_cta_create_desc")}</p>
              <div className="flex justify-left">
                <Button
                  className="bg-white text-black hover:bg-gray-100"
                  onClick={() => {
                    clearEditorSession()
                    router.push("/editor/new")
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("docs_create_new")}
                </Button>
              </div>
            </div>

            {statCardsEnabled && (
              <StatsCards showCards={enabledCards} overview={overview} isLoading={isLoading} />
            )}

            {quotaCardsEnabled && (
              <div className={DASHBOARD_GRID_QUOTA}>
                {enabledCards.includes("ai_quota") && (
                  <QuotaCard show="quota" overview={quota ?? null} isLoading={isQuotaLoading} />
                )}
                {enabledCards.includes("storage") && (
                  <QuotaCard show="storage" overview={quota ?? null} isLoading={isQuotaLoading} />
                )}
                {enabledCards.includes("referral") && <ReferralCard />}
              </div>
            )}

            {chartCardsEnabled && (
              <div className={DASHBOARD_GRID_CHART}>
                {enabledCards.includes("chart") && (
                  <Card className={`py-3 gap-1.5 h-full flex flex-col ${DASHBOARD_CARD_HOVER}`}>
                    <CardHeader className="pb-0 pt-0 px-4">
                      <CardTitle className="text-sm">{t("dash_chart_title")}</CardTitle>
                      <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
                    </CardHeader>
                    <CardContent className="ps-2 pt-0 px-4 pb-2 flex-1">
                      <div className="text-foreground [&_text]:fill-current">
                        <OverviewChart data={chartData} isLoading={isLoading} height={160} />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {enabledCards.includes("workspace_breakdown") && (
                  <div className="h-full">
                    <StatsByWorkspace data={workspaceBreakdownData} isLoading={isLoading} />
                  </div>
                )}
                {enabledCards.includes("recent_docs") && (
                  <Card className={`h-full flex flex-col ${DASHBOARD_CARD_HOVER}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{t("recent_docs_title")}</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="h-auto p-0 text-xs">
                    <Link href="/documents">{t("recent_docs_view_all")}</Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex-1">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-10 rounded bg-muted animate-pulse"
                        />
                      ))}
                    </div>
                  ) : !recentDocs?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("recent_docs_empty")}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {recentDocs.slice(0, 5).map((doc) => (
                        <li key={doc.id}>
                          <Link
                            href={`/editor/${doc.id}`}
                            className="flex items-center gap-2 py-1.5 rounded hover:bg-muted transition-colors group"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate group-hover:text-primary">
                                {doc.title || t("status_draft")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.workspace?.name} ·{" "}
                                {formatDistanceToNow(new Date(doc.updatedAt), {
                                  addSuffix: true,
                                  locale: vi,
                                })}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
                )}
              </div>
            )}

            
          </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
