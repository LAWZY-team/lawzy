"use client"

import { useState } from "react"
import { Check, Sparkles, HardDrive, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardOverview } from "@/hooks/dashboard/use-dashboard"
import { useAuthStore } from "@/stores/auth-store"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const STORAGE_LIMIT = 100 * 1024 * 1024 * 1024

const plans = [
  {
    planId: "free",
    name: "Free",
    description: "Dùng thử miễn phí",
    price: 0,
    billingCycle: "monthly",
    highlighted: false,
    contactSales: false,
    features: {
      dailyQuota: 5,
      templates: 3,
      storage: "500 MB",
      workspaceMembers: 1,
      aiAssistant: false,
    },
  },
  {
    planId: "pro",
    name: "Professional",
    description: "Cho cá nhân & nhóm nhỏ",
    price: 299000,
    billingCycle: "monthly",
    highlighted: true,
    contactSales: false,
    features: {
      dailyQuota: 100,
      templates: "unlimited",
      storage: "10 GB",
      workspaceMembers: 10,
      aiAssistant: true,
    },
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: "Cho doanh nghiệp",
    price: 0,
    billingCycle: "monthly",
    highlighted: false,
    contactSales: true,
    features: {
      dailyQuota: "unlimited",
      templates: "unlimited",
      storage: "100 GB",
      workspaceMembers: "unlimited",
      aiAssistant: true,
    },
  },
]

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function PaymentPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const { data: overview, isLoading } = useDashboardOverview()

  const storageUsed = overview?.storageUsed ?? 0
  const storagePercent = STORAGE_LIMIT > 0 ? (storageUsed / STORAGE_LIMIT) * 100 : 0
  const currentPlan = "pro"

  const handleUpgrade = async (planId: string) => {
    if (planId === "free") return
    setLoading(planId)

    try {
      if (planId === "enterprise") {
        toast.info("Vui lòng liên hệ sales để được tư vấn gói Enterprise")
        setLoading(null)
        return
      }

      const plan = plans.find((p) => p.planId === planId)
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || "demo",
          plan: planId,
          amount: plan?.price || 0,
        }),
      })

      const result = await response.json()
      if (result.checkoutUrl) {
        router.push(result.checkoutUrl)
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi tạo thanh toán")
      console.error(error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Thanh toán & Quota</h2>
        <p className="text-muted-foreground">
          Quản lý gói dịch vụ và theo dõi hạn mức sử dụng
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng tài liệu</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{overview?.totalDocuments ?? 0}</span>
                  <span className="text-muted-foreground text-sm">tài liệu</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {overview?.draftDocuments ?? 0} nháp &bull; {overview?.completedDocuments ?? 0} hoàn thành
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dung lượng lưu trữ</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{formatBytes(storageUsed)}</span>
                    <span className="text-muted-foreground text-sm">/ {formatBytes(STORAGE_LIMIT)}</span>
                  </div>
                </div>
                <Progress value={storagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Bao gồm tài liệu và tập tin tải lên
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4">Gói dịch vụ</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.planId}
              className={plan.highlighted ? "border-primary shadow-lg relative" : "relative"}
            >
              <CardHeader>
                {plan.highlighted && (
                  <Badge className="w-fit mb-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Phổ biến nhất
                  </Badge>
                )}
                {currentPlan === plan.planId && (
                  <Badge variant="secondary" className="w-fit mb-2 absolute top-6 right-6">
                    Đang sử dụng
                  </Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  {plan.price === 0 && !plan.contactSales ? (
                    <p className="text-3xl font-bold">Miễn phí</p>
                  ) : plan.contactSales ? (
                    <p className="text-2xl font-bold">Liên hệ</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold">
                        {plan.price.toLocaleString("vi-VN")} ₫
                      </p>
                      <p className="text-sm text-muted-foreground">/tháng</p>
                    </>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {typeof plan.features.dailyQuota === "number"
                      ? `${plan.features.dailyQuota} yêu cầu/ngày`
                      : "Không giới hạn yêu cầu"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {plan.features.templates === "unlimited"
                      ? "Không giới hạn templates"
                      : `${plan.features.templates} templates`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {plan.features.storage} lưu trữ
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {typeof plan.features.workspaceMembers === "number"
                      ? `${plan.features.workspaceMembers} thành viên`
                      : "Không giới hạn thành viên"}
                  </li>
                  {plan.features.aiAssistant && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      AI Assistant
                    </li>
                  )}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.planId)}
                  disabled={loading === plan.planId || currentPlan === plan.planId}
                >
                  {loading === plan.planId
                    ? "Đang xử lý..."
                    : plan.contactSales
                    ? "Liên hệ Sales"
                    : currentPlan === plan.planId
                    ? "Đang sử dụng"
                    : "Nâng cấp"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
