"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { sanitizeHtml } from "@/lib/sanitize"
import type { PublicShareSnapshot } from "@/lib/api/public-shares"
import {
  getGuardedPublicShareContent,
  requestPublicShareOtp,
  verifyPublicShareOtp,
} from "@/lib/api/public-shares"

type Step = "email-code" | "otp" | "view"

export default function PublicShareTokenClient({ token }: { token: string }) {
  const [step, setStep] = useState<Step>("email-code")
  const [email, setEmail] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snap, setSnap] = useState<PublicShareSnapshot | null>(null)

  const handleRequestOtp = async () => {
    setError(null)
    setLoading(true)
    try {
      await requestPublicShareOtp({ token, email, accessCode })
      setStep("otp")
    } catch {
      setError("Email hoặc mã truy cập không đúng, hoặc link đã hết hạn.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError(null)
    setLoading(true)
    try {
      await verifyPublicShareOtp({ token, email, otp })
      const content = await getGuardedPublicShareContent(token)
      setSnap(content)
      setStep("view")
    } catch {
      setError("OTP không đúng hoặc đã hết hạn.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "view" && snap) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {snap.title ?? "Hợp đồng (chỉ xem)"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Link chia sẻ công khai (read-only). Nội dung là snapshot tại thời điểm
              tạo link.
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(snap.html ?? "") }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 border rounded-lg p-6 bg-card">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Truy cập hợp đồng chia sẻ</h1>
          <p className="text-xs text-muted-foreground">
            Nhập email và mã truy cập (mã hợp đồng) được gửi cho bạn. Sau đó,
            hệ thống sẽ gửi mã OTP qua email để xác thực.
          </p>
        </div>

        {step === "email-code" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Email nhận hợp đồng</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Mã truy cập (mã hợp đồng)</label>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono tracking-[0.3em]"
                placeholder="XXXX-XXXX"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button
              type="button"
              className="w-full"
              disabled={loading}
              onClick={handleRequestOtp}
            >
              {loading ? "Đang gửi mã OTP..." : "Gửi mã OTP"}
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Mã OTP đã được gửi tới email <span className="font-medium">{email}</span>. Vui
              lòng kiểm tra hộp thư và nhập mã bên dưới.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Mã OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm font-mono tracking-[0.4em]"
                placeholder="123456"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading}
                onClick={() => setStep("email-code")}
              >
                Nhập lại email/mã truy cập
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={loading}
                onClick={handleVerifyOtp}
              >
                {loading ? "Đang xác thực..." : "Xác thực & xem hợp đồng"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

