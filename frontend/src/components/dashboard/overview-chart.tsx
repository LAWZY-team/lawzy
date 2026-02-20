"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardChart } from "@/hooks/dashboard/use-dashboard"

const AXIS_TICK_FILL = "currentColor"

export type DashboardPeriod = "week" | "month" | "year"

export function OverviewChart({ period = "year", height = 200 }: { period?: DashboardPeriod; height?: number }) {
  const { data, isLoading } = useDashboardChart(period)

  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />
  }

  const chartData = data ?? []

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
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
          tickFormatter={(v) => `${v}`}
          tick={{ fill: AXIS_TICK_FILL }}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
