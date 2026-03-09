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
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsContent, setTermsContent] = useState("")

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Forgot password form state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [isForgotPasswordSent, setIsForgotPasswordSent] = useState(false)

  const prevOpenRef = useRef(open)

  useEffect(() => {
    if (showTermsModal && !termsContent) {
      fetch("/term2.html")
        .then((res) => res.text())
        .then((text) => setTermsContent(text))
        .catch(() => setTermsContent("Không thể tải nội dung điều khoản."))
    }
  }, [showTermsModal, termsContent])

  const handleRequestRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreedToTerms) {
      setError("Vui lòng đồng ý với các điều khoản sử dụng")
      return
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || "Mật khẩu không hợp lệ")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Đăng ký thất bại")
        setIsLoading(false)
        return
      }

      toast.success("Mã OTP đã được gửi đến email của bạn")
      setMode("verify")
      setIsLoading(false)
    } catch {
      setError("Không thể kết nối đến server")
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 chữ số")
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
        setError(data.message || "Xác thực OTP thất bại")
        setIsLoading(false)
        return
      }

      // Đăng nhập tự động sau khi đăng ký thành công
      await handleLoginAfterRegister()
    } catch {
      setError("Không thể kết nối đến server")
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
        setError(data.message || "Đăng nhập thất bại")
        setIsLoading(false)
        return
      }

      setUser(data.user)
      await fetchUser()
      clearSession()
      toast.success("Đăng ký và đăng nhập thành công!")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Không thể đăng nhập")
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
        setError(data.message || "Email hoặc mật khẩu không đúng")
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
      setError("Không thể kết nối đến server")
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
        setError(data.message || "Đã xảy ra lỗi")
        setIsLoading(false)
        return
      }

      setIsForgotPasswordSent(true)
      setIsLoading(false)
    } catch {
      setError("Không thể kết nối đến server")
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
        className="max-w-md"
      >
        <div className="w-full">
          {mode === "verify" ? (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-4 items-center text-center pb-2">
                <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                <div>
                  <CardTitle className="text-2xl font-bold">Xác thực OTP</CardTitle>
                  <CardDescription className="mt-1">
                    Nhập mã OTP đã được gửi đến email của bạn
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
                    <Label htmlFor="email-display">Email</Label>
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
                      Mã OTP có hiệu lực trong 10 phút
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xác thực...
                      </>
                    ) : (
                      "Xác thực OTP"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode("register")}
                    disabled={isLoading}
                  >
                    Quay lại
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : mode === "register" ? (
            <Card className="border-0 shadow-xl">
              <CardHeader className="space-y-4 items-center text-center pb-2">
                <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                <div>
                  <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
                  <CardDescription className="mt-1">
                    Đăng ký để tiếp tục sử dụng
                  </CardDescription>
                </div>
              </CardHeader>

              <form onSubmit={handleRequestRegistration}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <PasswordRequirements
                      password={password}
                      open={showPasswordRequirements}
                      onOpenChange={setShowPasswordRequirements}
                    >
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Nhập mật khẩu"
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
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Nhập lại mật khẩu"
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
                Tôi đồng ý với các điều khoản của Lawzy
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className= "underline hover:text-blue-500 bg-transparent border-0 cursor-pointer"
                >
                  ĐIỀU KHOẢN
                </button>{" "}
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
                        Đang gửi OTP...
                      </>
                    ) : (
                      "Đăng ký"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-primary font-medium hover:underline"
                    >
                      Đăng nhập
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
                      <CardTitle className="text-2xl font-bold">Kiểm tra email</CardTitle>
                      <CardDescription className="mt-2">
                        Nếu tài khoản với email <strong>{forgotPasswordEmail}</strong> tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
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
                      Quay lại đăng nhập
                    </Button>
                  </CardFooter>
                </>
              ) : (
                <>
                  <CardHeader className="space-y-4 items-center text-center pb-2">
                    <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
                    <div>
                      <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
                      <CardDescription className="mt-1">
                        Nhập email để nhận link đặt lại mật khẩu
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
                        <Label htmlFor="forgot-password-email">Email</Label>
                        <Input
                          id="forgot-password-email"
                          type="email"
                          placeholder="you@example.com"
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
                            Đang gửi...
                          </>
                        ) : (
                          "Gửi link đặt lại"
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
                        Quay lại đăng nhập
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
                  <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                  <CardDescription className="mt-1">
                    Đăng nhập để tiếp tục chỉnh sửa hợp đồng
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
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="admin@lawzy.vn"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Mật khẩu</Label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot-password")}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
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
                        Đang đăng nhập...
                      </>
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="text-primary font-medium hover:underline"
                    >
                      Đăng ký ngay
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </Modal>

      {/* Terms Modal */}
      <Modal
        open={showTermsModal}
        onOpenChange={setShowTermsModal}
        size="lg"
        title="Điều Khoản Sử Dụng"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Điều Khoản Sử Dụng</h2>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {termsContent ? (
              <div
                className="lawzy-terms prose prose-sm max-w-none text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:first:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: termsContent }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Đang tải nội dung...</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
