"use client"

import { useState, useEffect, useRef, startTransition } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { Eye, EyeOff, Loader2, Mail, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { validatePassword } from "@/lib/utils/password-validator"
import { PasswordRequirements } from "@/components/password-requirements"
import { useAuthStore } from "@/stores/auth-store"
import { useGuestEditorSessionStore } from "@/stores/guest-editor-session-store"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TermsModal } from "@/components/auth/terms-modal"
import { PrivacyModal } from "@/components/auth/privacy-modal"
import { useT } from "@/components/i18n-provider"

const POSITION_OPTIONS = [
  { value: "founder", key: "auth_position_founder" as const },
  { value: "hr", key: "auth_position_hr" as const },
  { value: "accountant", key: "auth_position_accountant" as const },
  { value: "legal", key: "auth_position_legal" as const },
  { value: "lawyer", key: "auth_position_lawyer" as const },
  { value: "sales", key: "auth_position_sales" as const },
  { value: "freelancer", key: "auth_position_freelancer" as const },
  { value: "other", key: "auth_position_other" as const },
]

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const { setUser, fetchUser } = useAuthStore()
  const { clearSession } = useGuestEditorSessionStore()
  const [mode, setMode] = useState<"login" | "register" | "verify" | "forgot-password">("login")
  
  // Register form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [position, setPosition] = useState("")
  const [customPosition, setCustomPosition] = useState("")
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { t } = useT()
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Forgot password form state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [isForgotPasswordSent, setIsForgotPasswordSent] = useState(false)

  const prevOpenRef = useRef(open)

  const handleRequestRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreedToTerms) {
      setError(t("auth_register_error_terms"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("auth_register_error_password_mismatch"))
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || t("auth_error_password_invalid"))
      return
    }

    if (!position) {
      setError(t("auth_register_error_position"))
      return
    }

    if (position === "other" && !customPosition.trim()) {
      setError(t("auth_register_error_position_other"))
      return
    }

    setIsLoading(true)

    try {
      const opt = POSITION_OPTIONS.find((o) => o.value === position)
      const finalPosition = position === "other" ? customPosition : (opt ? t(opt.key) : position)
      const res = await fetch("/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, position: finalPosition }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || t("auth_register_error_failed"))
        setIsLoading(false)
        return
      }

      toast.success(t("auth_register_toast_otp_sent"))
      setMode("verify")
      setIsLoading(false)
    } catch {
      setError(t("auth_error_connection"))
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (otp.length !== 6) {
      setError(t("auth_register_error_otp"))
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || t("auth_register_error_verify"))
        setIsLoading(false)
        return
      }

      // Đăng nhập tự động sau khi đăng ký thành công
      await handleLoginAfterRegister()
    } catch {
      setError(t("auth_error_connection"))
      setIsLoading(false)
    }
  }

  const handleLoginAfterRegister = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || t("auth_error_login_failed"))
        setIsLoading(false)
        return
      }

      setUser(data.user)
      await fetchUser()
      clearSession()
      toast.success(t("auth_toast_register_success"))
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError(t("auth_error_login_failed"))
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || t("auth_error_credentials"))
        setIsLoading(false)
        return
      }

      setUser(data.user)
      await fetchUser()
      clearSession()
      toast.success("Đăng nhập thành công!")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError(t("auth_error_connection"))
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (idToken: string) => {
    setError("")
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || t("auth_error_google"))
        return
      }
      setUser(data.user)
      await fetchUser()
      clearSession()
      toast.success("Đăng nhập thành công!")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError(t("auth_error_connection"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || t("auth_error_generic"))
        setIsLoading(false)
        return
      }

      setIsForgotPasswordSent(true)
      setIsLoading(false)
    } catch {
      setError(t("auth_error_connection"))
      setIsLoading(false)
    }
  }

  // Reset form when modal opens (transition from closed to open)
  useEffect(() => {
    const wasClosed = !prevOpenRef.current
    const isNowOpen = open
    
    if (wasClosed && isNowOpen) {
      // Use startTransition to batch state updates and avoid cascading renders
      startTransition(() => {
        setMode("login")
        setError("")
        setName("")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setPosition("")
        setCustomPosition("")
        setOtp("")
        setLoginEmail("")
        setLoginPassword("")
        setForgotPasswordEmail("")
        setIsForgotPasswordSent(false)
        setAgreedToTerms(false)
      })
    }
    
    prevOpenRef.current = open
  }, [open])

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        size="md"
        title=""
        className="max-w-md overflow-y-auto max-h-[95vh] sm:max-h-[85vh]"
      >
        <div className="w-full">
          {mode === "verify" ? (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-4 items-center text-center pb-2">
                <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                <div>
                  <CardTitle className="text-2xl font-bold">{t("auth_register_otp_title")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("auth_register_otp_desc")} <br/>{t("auth_forgot_check_spam")}
                  </CardDescription>
                </div>
              </CardHeader>

              <form onSubmit={handleVerifyOTP}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email-display">{t("auth_email")}</Label>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp">Mã OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Nhập 6 chữ số"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                        setOtp(value)
                      }}
                      required
                      maxLength={6}
                      disabled={isLoading}
                      className="text-center text-2xl tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("auth_register_otp_valid")}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth_register_verifying")}
                      </>
                    ) : (
                      t("auth_register_verify_otp")
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("register")}
                    disabled={isLoading}
                  >
                    {t("auth_register_back")}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : mode === "register" ? (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-4 items-center text-center pb-2">
                <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                <div>
                  <CardTitle className="text-2xl font-bold">{t("auth_register_step1")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("auth_modal_register_subtitle")}
                  </CardDescription>
                </div>
              </CardHeader>

              <form onSubmit={handleRequestRegistration}>
                <CardContent className="space-y-4 pt-0">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <GoogleSignInButton
                    onSuccess={handleGoogleSuccess}
                    onError={(err) => setError(err.message || t("auth_register_error_google"))}
                    disabled={isLoading}
                    label="signup"
                    className="w-full"
                  />
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t("auth_or")}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="name">{t("auth_name")}</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("auth_name_placeholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth_email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth_email_placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">{t("auth_register_position")} <span className="text-destructive">*</span></Label>
                    <Select onValueChange={setPosition} value={position} disabled={isLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("auth_register_position_placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(opt.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {position === "other" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="customPosition">{t("auth_register_position_other")} <span className="text-destructive">*</span></Label>
                      <Input
                        id="customPosition"
                        placeholder={t("auth_register_position_custom_placeholder")}
                        value={customPosition}
                        onChange={(e) => setCustomPosition(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="password">{t("auth_password")}</Label>
                    <PasswordRequirements
                      password={password}
                      open={showPasswordRequirements}
                      onOpenChange={setShowPasswordRequirements}
                    >
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth_register_password_placeholder")}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            if (e.target.value.length > 0) {
                              setShowPasswordRequirements(true)
                            }
                          }}
                          onFocus={() => setShowPasswordRequirements(true)}
                          onBlur={() => {
                            setTimeout(() => setShowPasswordRequirements(false), 200)
                          }}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </PasswordRequirements>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("auth_register_confirm_password")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("auth_register_confirm_password_placeholder")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                {t("auth_register_agree_terms")}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                  className="underline hover:text-blue-500 bg-transparent border-0 cursor-pointer"
                >
                  {t("auth_register_terms_link")}
                </button>
                {t("auth_register_and")}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}
                  className="underline hover:text-blue-500 bg-transparent border-0 cursor-pointer"
                >
                  {t("auth_register_privacy_link")}
                </button>
                {t("auth_register_terms_suffix")}
              </Label>
            </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full mt-3"
                    size="lg"
                    disabled={isLoading || !agreedToTerms}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth_register_sending_otp")}
                      </>
                    ) : (
                      t("auth_register")
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    {t("auth_register_has_account")}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-primary font-medium hover:underline"
                    >
                      {t("auth_login")}
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          ) : mode === "forgot-password" ? (
            <Card className="border-0 shadow-xl">
              {isForgotPasswordSent ? (
                <>
                  <CardHeader className="space-y-4 items-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">{t("auth_forgot_success_title")}</CardTitle>
                      <CardDescription className="mt-2">
                        {t("auth_forgot_success_desc", { email: forgotPasswordEmail })}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setMode("login")
                        setIsForgotPasswordSent(false)
                        setForgotPasswordEmail("")
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("auth_forgot_back")}
                    </Button>
                  </CardFooter>
                </>
              ) : (
                <>
                  <CardHeader className="space-y-4 items-center text-center pb-2">
                    <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                    <div>
                      <CardTitle className="text-2xl font-bold">{t("auth_forgot_title")}</CardTitle>
                      <CardDescription className="mt-1">
                        {t("auth_forgot_subtitle")}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <form onSubmit={handleForgotPassword}>
                    <CardContent className="space-y-4">
                      {error && (
                        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="forgot-password-email">{t("auth_email")}</Label>
                        <Input
                          id="forgot-password-email"
                          type="email"
                          placeholder={t("auth_email_placeholder")}
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          required
                          autoComplete="email"
                          disabled={isLoading}
                        />
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                      <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("auth_forgot_btn_loading")}
                          </>
                        ) : (
                          t("auth_forgot_btn_send")
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setMode("login")
                          setForgotPasswordEmail("")
                          setError("")
                        }}
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("auth_forgot_back")}
                      </Button>
                    </CardFooter>
                  </form>
                </>
              )}
            </Card>
          ) : (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-4 items-center text-center pb-2">
                <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                <div>
                  <CardTitle className="text-2xl font-bold">{t("auth_login_title")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("auth_login_subtitle_editor")}
                  </CardDescription>
                </div>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t("auth_email")}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t("auth_email_placeholder")}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">{t("auth_password")}</Label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot-password")}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {t("auth_forgot_password")}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder={t("auth_password_placeholder")}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        tabIndex={-1}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth_login_loading")}
                      </>
                    ) : (
                      t("auth_login_btn")
                    )}
                  </Button>

                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t("auth_or")}</span>
                    </div>
                  </div>

                  <GoogleSignInButton
                    onSuccess={handleGoogleSuccess}
                    onError={(err) => {
                      setError(err.message || t("auth_error_google"));
                    }}
                    disabled={isLoading}
                    className="w-full flex justify-center"
                  />

                  <p className="text-sm text-muted-foreground text-center">
                    {t("auth_no_account")}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="text-primary font-medium hover:underline"
                    >
                      {t("auth_register_now")}
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </Modal>

      <TermsModal
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        onAccept={() => setAgreedToTerms(true)}
        requireScrollToBottom
      />
      <PrivacyModal
        open={showPrivacyModal}
        onOpenChange={setShowPrivacyModal}
        onAccept={() => setAgreedToTerms(true)}
        requireScrollToBottom
      />
    </>
  )
}
