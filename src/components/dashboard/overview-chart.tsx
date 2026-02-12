"use client"

import { useMemo } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import contractsData from "@/mock/contracts.json"

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"]
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

const AXIS_TICK_FILL = "currentColor"

export type DashboardPeriod = "week" | "month" | "year"

export function OverviewChart({ period = "year", height = 200 }: { period?: DashboardPeriod; height?: number }) {
  const data = useMemo(() => {
    const now = new Date()
    const contracts = contractsData.contracts

    if (period === "week") {
      const out = DAYS.map((name) => ({ name, total: 0 }))
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
      startOfWeek.setHours(0, 0, 0, 0)
      contracts.forEach((c) => {
        const d = new Date(c.createdAt)
        if (d >= startOfWeek && d <= now) {
          const dayIdx = d.getDay()
          const i = dayIdx === 0 ? 6 : dayIdx - 1
          out[i].total += 1
        }
      })
      return out
    }

    if (period === "month") {
      const out = [
        { name: "Tuần 1", total: 0 },
        { name: "Tuần 2", total: 0 },
        { name: "Tuần 3", total: 0 },
        { name: "Tuần 4", total: 0 },
      ]
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      contracts.forEach((c) => {
        const d = new Date(c.createdAt)
        if (d >= startOfMonth && d <= now) {
          const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 8), 3)
          out[weekIdx].total += 1
        }
      })
      return out
    }

    // year
    const byMonth: Record<number, number> = {}
    MONTHS.forEach((_, i) => (byMonth[i] = 0))
    contracts.forEach((c) => {
      const d = new Date(c.createdAt)
      if (d.getFullYear() === now.getFullYear()) {
        const m = d.getMonth()
        byMonth[m] = (byMonth[m] ?? 0) + 1
      }
    })
    return MONTHS.map((name, i) => ({ name, total: byMonth[i] ?? 0 }))
  }, [period])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
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
