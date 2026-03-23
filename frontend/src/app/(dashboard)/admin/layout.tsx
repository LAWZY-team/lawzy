"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const authResolved = useAuthStore((s) => s.authResolved)

  const isAdmin = user?.roles?.some((r) => r.toLowerCase() === "admin") ?? false

  useEffect(() => {
    if (!authResolved) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!isAdmin) {
      router.replace("/dashboard")
    }
  }, [authResolved, user, isAdmin, router])

  if (!authResolved || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    )
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Bạn không có quyền truy cập.</p>
      </div>
    )
  }

  return <>{children}</>
}
