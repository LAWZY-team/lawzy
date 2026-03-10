"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { validatePassword } from "@/lib/utils/password-validator";
import { PasswordRequirements } from "@/components/password-requirements";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState("");

  useEffect(() => {
    // Load terms content when modal opens
    if (showTermsModal && !termsContent) {
      fetch("/term2.html")
        .then((res) => res.text())
        .then((text) => setTermsContent(text))
        .catch(() => setTermsContent("Không thể tải nội dung điều khoản."));
    }
  }, [showTermsModal, termsContent]);

  const handleRequestRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreedToTerms) {
      setError("Vui lòng đồng ý với các điều khoản sử dụng");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message || "Mật khẩu không hợp lệ");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Đăng ký thất bại");
        setIsLoading(false);
        return;
      }

      toast.success("Mã OTP đã được gửi đến email của bạn");
      setStep("verify");
      setIsLoading(false);
    } catch {
      setError("Không thể kết nối đến server");
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Mã OTP phải có 6 chữ số");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Xác thực OTP thất bại");
        setIsLoading(false);
        return;
      }

      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      router.push("/login");
    } catch {
      setError("Không thể kết nối đến server");
      setIsLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="w-full max-w-md px-4">
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
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
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
                onClick={() => setStep("register")}
                disabled={isLoading}
              >
                Quay lại
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md px-4">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-4 items-center text-center pb-2">
            <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
          <div>
            <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
            <CardDescription className="mt-1">
              Đăng ký để bắt đầu sử dụng Lawzy
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
                      setPassword(e.target.value);
                      if (e.target.value.length > 0) {
                        setShowPasswordRequirements(true);
                      }
                    }}
                    onFocus={() => setShowPasswordRequirements(true)}
                    onBlur={() => {
                      // Delay closing to allow clicking on popover
                      setTimeout(() => setShowPasswordRequirements(false), 200);
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
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
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
            <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading || !agreedToTerms}>
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
              <Link href="/login" className="text-primary font-medium hover:underline">
                Đăng nhập
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; {new Date().getFullYear()} Lawzy. Nền tảng quản lý hợp đồng pháp lý.
      </p>

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
    </div>
  );
}
