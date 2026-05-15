"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordRequirements } from "@/components/password-requirements"
import { useT } from "@/components/i18n-provider"
import { toast } from "sonner"
import { validatePassword } from "@/lib/utils/password-validator"
import { api } from "@/lib/api/client"

export function PasswordForm() {
  const { t } = useT()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [isChanging, setIsChanging] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth_password_mismatch"))
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError(t("auth_password_same_as_current"))
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setPasswordError(validation.message ? t(validation.message) : t("auth_error_password_invalid"))
      return
    }

    setIsChanging(true)
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      })
      toast.success(t("auth_password_change_success"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      const message = (err as Error).message
      setPasswordError(message || t("auth_password_change_failed"))
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {passwordError && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {passwordError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("settings_password_current")}</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isChanging}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            tabIndex={-1}
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("settings_password_new")}</Label>
        <PasswordRequirements
          password={newPassword}
          open={showPasswordRequirements}
          onOpenChange={setShowPasswordRequirements}
        >
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (e.target.value.length > 0) setShowPasswordRequirements(true)
              }}
              onFocus={() => setShowPasswordRequirements(true)}
              onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
              required
              disabled={isChanging}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
              tabIndex={-1}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </PasswordRequirements>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("settings_password_confirm")}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isChanging}
        />
      </div>

      <Button type="submit" disabled={isChanging}>
        {isChanging ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("common_loading")}
          </>
        ) : (
          t("settings_password_btn")
        )}
      </Button>
    </form>
  )
}
