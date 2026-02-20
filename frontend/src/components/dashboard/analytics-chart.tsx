"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardChart } from "@/hooks/dashboard/use-dashboard"

const AXIS_TICK_FILL = "currentColor"

export function AnalyticsChart() {
  const { data, isLoading } = useDashboardChart("week")

  if (isLoading) {
    return <Skeleton className="w-full h-[280px]" />
  }

  const chartData = (data ?? []).map((d) => ({
    name: d.name,
    created: d.total,
    updated: Math.max(0, d.total - 1),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="currentColor"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tick={{ fill: AXIS_TICK_FILL }}
        />
        <YAxis
          stroke="currentColor"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tick={{ fill: AXIS_TICK_FILL }}
        />
        <Area
          type="monotone"
          dataKey="created"
          stroke="hsl(var(--primary))"
          className="text-primary"
          fill="currentColor"
          fillOpacity={0.2}
        />
        <Area
          type="monotone"
          dataKey="updated"
          stroke="hsl(var(--muted-foreground))"
          fill="currentColor"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
