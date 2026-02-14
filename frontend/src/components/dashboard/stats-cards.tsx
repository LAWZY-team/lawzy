"use client"

import { FileText, FileCheck, FileEdit, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import contractsData from "@/mock/contracts.json"

function useStats() {
  const contracts = contractsData.contracts
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const total = contracts.length
  const signedThisMonth = contracts.filter((c) => {
    const d = new Date(c.updatedAt)
    return (c.status === "active" || c.status === "signed") && d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
  const draft = contracts.filter((c) => c.status === "draft").length

  return { total, signedThisMonth, draft }
}

export function StatsCards() {
  const { total, signedThisMonth, draft } = useStats()

  const cards = [
    {
      title: "Tổng văn bản",
      value: total,
      sub: "hợp đồng trong workspace",
      icon: FileText,
    },
    {
      title: "Đã ký tháng này",
      value: signedThisMonth,
      sub: "văn bản có hiệu lực",
      icon: FileCheck,
    },
    {
      title: "Đang soạn thảo",
      value: draft,
      sub: "bản nháp",
      icon: FileEdit,
    },
    {
      title: "So với tháng trước",
      value: "+12%",
      sub: "tăng hoạt động",
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
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
