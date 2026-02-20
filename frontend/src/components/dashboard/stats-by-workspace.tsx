"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspaceBreakdown } from "@/hooks/dashboard/use-dashboard"
import { useT } from "@/components/i18n-provider"

function SimpleBarList({
  items,
  valueFormatter,
}: {
  items: { name: string; value: number }[]
  valueFormatter: (n: number) => string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 truncate text-xs text-muted-foreground">
                {i.name}
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-primary"
                  style={{ width }}
                />
              </div>
            </div>
            <div className="shrink-0 ps-2 text-xs font-medium tabular-nums">
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function StatsByWorkspace() {
  const { data, isLoading } = useWorkspaceBreakdown()
  const { t } = useT()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dash_stats_by_ws")}</CardTitle>
        <CardDescription>{t("dash_docs_per_ws")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">{t("dash_no_data")}</p>
        ) : (
          <SimpleBarList
            items={data}
            valueFormatter={(n) => t("dash_n_documents", { n })}
          />
        )}
      </CardContent>
    </Card>
  )
}
