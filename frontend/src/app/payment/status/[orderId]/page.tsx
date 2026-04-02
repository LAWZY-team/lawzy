"use client"

import { use, useEffect, useState } from "react"
import { CheckCircle2, XCircle, Clock, ArrowRight, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api } from "@/lib/api/client"
import { useT } from "@/components/i18n-provider"

const POLL_MS = 3000
const POLL_MAX_ATTEMPTS = 40

type PaymentPayload = {
  status: string
  amount: number
  plan?: { name: string }
  checkoutUrl?: string | null
}

function openCheckout(url: string) {
  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer")
  } else {
    window.location.href = url
  }
}

export default function PaymentStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params)
  const { t } = useT()
  const router = useRouter()
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending")
  const [countdown, setCountdown] = useState(5)
  const [paymentInfo, setPaymentInfo] = useState<PaymentPayload | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    let interval: ReturnType<typeof setInterval> | undefined

    async function fetchAndUpdate(): Promise<boolean> {
      try {
        const p = await api.get<PaymentPayload>(
          `/payments/by-order/${resolvedParams.orderId}`
        )
        if (cancelled) return true
        setNotFound(false)
        setPaymentInfo(p)
        if (p.status === "paid") {
          setStatus((prev) => {
            if (prev !== "success") {
              toast.success(t("payment_status_toast_success"))
            }
            return "success"
          })
          return true
        }
        if (p.status === "cancelled" || p.status === "failed") {
          setStatus("failed")
          return true
        }
        setStatus("pending")
        return false
      } catch {
        if (!cancelled) setNotFound(true)
        return true
      }
    }

    void (async () => {
      const stop = await fetchAndUpdate()
      if (stop || cancelled) return
      interval = setInterval(async () => {
        attempts += 1
        if (attempts >= POLL_MAX_ATTEMPTS) {
          clearInterval(interval)
          return
        }
        const done = await fetchAndUpdate()
        if (done) clearInterval(interval)
      }, POLL_MS)
    })()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [resolvedParams.orderId, t])

  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (status === "success" && countdown === 0) {
      router.push("/payment")
    }
  }, [status, countdown, router])

  const checkoutUrl = paymentInfo?.checkoutUrl?.trim()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {notFound && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
              </div>
              <CardTitle>{t("payment_status_page_failed")}</CardTitle>
              <CardDescription>{t("payment_status_not_found")}</CardDescription>
            </>
          )}
          {!notFound && status === "pending" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-300" />
              </div>
              <CardTitle>{t("payment_status_page_title")}</CardTitle>
              <CardDescription>
                {t("payment_status_page_desc_pending", { orderId: resolvedParams.orderId })}
              </CardDescription>
            </>
          )}
          {!notFound && status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
              </div>
              <CardTitle>{t("payment_status_page_success")}</CardTitle>
              <CardDescription>{t("payment_status_page_desc_success")}</CardDescription>
            </>
          )}
          {!notFound && status === "failed" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-300" />
              </div>
              <CardTitle>{t("payment_status_page_failed")}</CardTitle>
              <CardDescription>{t("payment_status_page_desc_failed")}</CardDescription>
            </>
          )}
        </CardHeader>

        {!notFound && (
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("payment_status_page_order")}:</span>
                <span className="font-medium">{resolvedParams.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("payment_history_plan")}:</span>
                <Badge>{paymentInfo?.plan?.name ?? t("plan_na")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("payment_status_page_amount")}:</span>
                <span className="font-medium">
                  {paymentInfo?.amount != null
                    ? `${paymentInfo.amount.toLocaleString("vi-VN")} ₫`
                    : t("plan_na")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("payment_history_status")}:</span>
                <Badge
                  variant={
                    status === "success"
                      ? "default"
                      : status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {status === "pending" && t("payment_status_processing_label")}
                  {status === "success" && t("payment_status_success")}
                  {status === "failed" && t("payment_status_failed")}
                </Badge>
              </div>
            </div>

            {status === "pending" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/80 p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    {t("payment_status_waiting_payos")}
                  </p>
                </div>
                {checkoutUrl ? (
                  <Button className="w-full" onClick={() => openCheckout(checkoutUrl)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("payment_open_checkout")}
                  </Button>
                ) : null}
              </div>
            )}

            {status === "success" && (
              <>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <p className="text-sm">{t("payment_status_redirect", { n: countdown })}</p>
                </div>
                <Button className="w-full" onClick={() => router.push("/payment")}>
                  {t("payment_btn_back_payment")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {status === "failed" && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => router.push("/payment")}>
                  {t("payment_btn_try_again")}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/payment")}>
                  {t("payment_btn_back_payment")}
                </Button>
              </div>
            )}
          </CardContent>
        )}

        {notFound && (
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/payment")}>
              {t("payment_btn_back_payment")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
