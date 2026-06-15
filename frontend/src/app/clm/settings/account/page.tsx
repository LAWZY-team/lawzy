"use client"

import { Separator } from "@/components/ui/separator"
import { AccountForm } from "@/components/settings/account-form"
import { useT } from "@/components/i18n-provider"

export default function AccountPage() {
  const { t } = useT()
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("settings_account")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings_account_desc")}
        </p>
      </div>
      <Separator />
      <AccountForm />
    </div>
  )
}
