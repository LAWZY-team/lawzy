"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import contractsData from "@/mock/contracts.json"
import workspacesData from "@/mock/workspaces.json"

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
  const byWorkspace = useMemo(() => {
    const count: Record<string, number> = {}
    contractsData.contracts.forEach((c) => {
      const id = (c as { workspaceId?: string }).workspaceId ?? "Khác"
      count[id] = (count[id] ?? 0) + 1
    })
    const workspaces = workspacesData.workspaces as { workspaceId: string; name: string }[]
    return workspaces.map((w) => ({
      name: w.name,
      value: count[w.workspaceId] ?? 0,
    }))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thống kê theo không gian làm việc</CardTitle>
        <CardDescription>Số văn bản theo từng workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleBarList
          items={byWorkspace}
          valueFormatter={(n) => `${n} văn bản`}
        />
      </CardContent>
    </Card>
  )
}
