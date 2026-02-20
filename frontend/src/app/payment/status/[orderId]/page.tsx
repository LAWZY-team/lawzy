"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useQuotaStore } from "@/stores/quota-store"

export default function PaymentStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { updateQuota } = useQuotaStore()
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Auto-redirect on success
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (status === 'success' && countdown === 0) {
      router.push('/dashboard')
    }
  }, [status, countdown, router])

  const handleSimulateSuccess = async () => {
    setStatus('success')
    
    // Simulate webhook
    await fetch('/api/payment/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: resolvedParams.orderId,
        status: 'success',
      }),
    })

    // Update quota
    updateQuota({
      dailyLimit: 100,
      dailyRemaining: 100,
      subscriptionPlan: 'pro',
    })

    toast.success('Thanh toán thành công! Quota đã được cập nhật.')
  }

  const handleSimulateFailure = () => {
    setStatus('failed')
    toast.error('Thanh toán thất bại')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {status === 'pending' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />
              </div>
              <CardTitle>Đang xử lý thanh toán</CardTitle>
              <CardDescription>Mã đơn hàng: {resolvedParams.orderId}</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <CardTitle>Thanh toán thành công!</CardTitle>
              <CardDescription>Cảm ơn bạn đã nâng cấp gói Pro</CardDescription>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
              </div>
              <CardTitle>Thanh toán thất bại</CardTitle>
              <CardDescription>Vui lòng thử lại sau</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mã đơn hàng:</span>
              <span className="font-medium">{resolvedParams.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gói:</span>
              <Badge>Pro</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số tiền:</span>
              <span className="font-medium">1,200,000 ₫</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trạng thái:</span>
              <Badge
                variant={
                  status === 'success'
                    ? 'default'
                    : status === 'failed'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {status === 'pending' && 'Đang xử lý'}
                {status === 'success' && 'Thành công'}
                {status === 'failed' && 'Thất bại'}
              </Badge>
            </div>
          </div>

          {status === 'pending' && (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-center text-muted-foreground">
                  Đây là môi trường demo. Sử dụng các nút bên dưới để mô phỏng kết quả thanh toán.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleSimulateSuccess}
                >
                  Mô phỏng thành công
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleSimulateFailure}
                >
                  Mô phỏng thất bại
                </Button>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-sm">
                  Chuyển về dashboard trong <span className="font-bold">{countdown}</span> giây...
                </p>
              </div>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>
                Về Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {status === 'failed' && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => router.push('/payment')}>
                Thử lại
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
                Về Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
