"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { I18nProvider, useT } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

function UnauthorizedHandler() {
  const { t } = useT();
  const logout = useAuthStore((state) => state.logout);

  React.useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      toast.error(t("auth_session_expired"));
    };
    window.addEventListener("lawzy:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("lawzy:unauthorized", handleUnauthorized);
  }, [logout, t]);

  return null;
}

export function Providers({
  children,
  initialLocale = "vi",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={initialLocale}>
        {children}
        <OnboardingTour />
        <UnauthorizedHandler />
      </I18nProvider>
    </QueryClientProvider>
  );
}
