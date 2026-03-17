"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { I18nProvider } from "@/components/i18n-provider"
import { OnboardingTour } from "@/components/onboarding-tour"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {children}
        <OnboardingTour />
      </I18nProvider>
    </QueryClientProvider>
  )
}

