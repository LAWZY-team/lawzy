"use client"

import { Separator } from "@/components/ui/separator"
import { DisplayForm } from "@/components/settings/display-form"
import { DashboardDisplayForm } from "@/components/settings/dashboard-display-form"
import { useT } from "@/components/i18n-provider"

export default function DisplayPage() {
  const { t } = useT()
  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-lg font-medium">{t("settings_display")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings_display_desc")}
        </p>
      </div>
      <Separator />
      <div className="space-y-8">
        <DisplayForm />
        <Separator />
        <DashboardDisplayForm />
      </div>
    </div>
  )
}
