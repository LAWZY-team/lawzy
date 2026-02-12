"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import contractsData from "@/mock/contracts.json"

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

const AXIS_TICK_FILL = "currentColor"

export function AnalyticsChart() {
  const data = useMemo(() => {
    const byDay: Record<number, { created: number; updated: number }> = {}
    DAYS.forEach((_, i) => (byDay[i] = { created: 0, updated: 0 }))

    contractsData.contracts.forEach((c) => {
      const created = new Date(c.createdAt).getDay()
      const updated = new Date(c.updatedAt).getDay()
      const ci = created === 0 ? 6 : created - 1
      const ui = updated === 0 ? 6 : updated - 1
      byDay[ci].created += 1
      byDay[ui].updated += 1
    })

    return DAYS.map((name, i) => ({
      name,
      created: byDay[i]?.created ?? 0,
      updated: byDay[i]?.updated ?? 0,
    }))
  }, [])

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
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
