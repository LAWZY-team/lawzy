"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { I18nProvider } from "@/components/i18n-provider"
import { OnboardingTour } from "@/components/onboarding-tour"
import { useAuthStore } from "@/stores/auth-store"
import { toast } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient())
  const logout = useAuthStore((state) => state.logout)

  React.useEffect(() => {
    const handleUnauthorized = () => {
      logout()
      toast.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    }

    window.addEventListener('lawzy:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('lawzy:unauthorized', handleUnauthorized)
  }, [logout])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {children}
        <OnboardingTour />
      </I18nProvider>
    </QueryClientProvider>
  )
}

