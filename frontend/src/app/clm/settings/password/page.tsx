"use client"

import { Separator } from "@/components/ui/separator"
import { PasswordForm } from "@/components/settings/password-form"
import { useT } from "@/components/i18n-provider"

export default function SettingsPasswordPage() {
  const { t } = useT()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("settings_password")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings_password_desc")}
        </p>
      </div>
      <Separator />
      <PasswordForm />
    </div>
  )
}
