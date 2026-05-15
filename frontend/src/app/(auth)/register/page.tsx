"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AccountTypeSelector, type AccountType } from "@/components/auth/account-type-selector";
import { ProgressSteps, ProgressStepsVertical } from "@/components/auth/progress-steps";
import { StepNav } from "@/components/auth/step-nav";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { isBotProtectionEnabled } from "@/lib/bot-protection";
import { useT } from "@/components/i18n-provider";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff, Loader2, Lock, Mail, UserCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { validatePassword } from "@/lib/utils/password-validator";
import { PasswordRequirements } from "@/components/password-requirements";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermsModal } from "@/components/auth/terms-modal";
import { PrivacyModal } from "@/components/auth/privacy-modal";

const POSITION_OPTIONS = [
  { value: "founder", key: "auth_position_founder" as const },
  { value: "hr", key: "auth_position_hr" as const },
  { value: "accountant", key: "auth_position_accountant" as const },
  { value: "legal", key: "auth_position_legal" as const },
  { value: "lawyer", key: "auth_position_lawyer" as const },
  { value: "sales", key: "auth_position_sales" as const },
  { value: "freelancer", key: "auth_position_freelancer" as const },
  { value: "other", key: "auth_position_other" as const },
];

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useT();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [position, setPosition] = useState("");
  const [customPosition, setCustomPosition] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [botProtectionToken, setBotProtectionToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const isStep2SubmitBlocked = isBotProtectionEnabled && !botProtectionToken;

  const registerSteps = useMemo(
    () => [
      { id: "1", label: t("auth_register_step1"), description: t("auth_register_step1_desc"), icon: Lock },
      { id: "2", label: t("auth_register_step2"), description: t("auth_register_step2_desc"), icon: UserCircle },
      { id: "3", label: t("auth_register_step3"), description: t("auth_register_step3_desc"), icon: Mail },
      { id: "4", label: t("auth_register_step4"), description: t("auth_register_step4_desc"), icon: CheckCircle2 },
    ],
    [t]
  );

  const validateStep1 = (): boolean => {
    setError("");
    if (!agreedToTerms) {
      setError(t("auth_register_error_terms"));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t("auth_register_error_password_mismatch"));
      return false;
    }
    const pv = validatePassword(password);
    if (!pv.valid) {
      setError(pv.message ? t(pv.message) : t("auth_error_password_invalid"));
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    setError("");
    if (!position) {
      setError(t("auth_register_error_position"));
      return false;
    }
    if (position === "other" && !customPosition.trim()) {
      setError(t("auth_register_error_position_other"));
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      if (isStep2SubmitBlocked) {
        setError(t("auth_error_bot_protection"));
        return;
      }
      setIsLoading(true);
      try {
        const opt = POSITION_OPTIONS.find((o) => o.value === position);
        const finalPosition = position === "other" ? customPosition : (opt ? t(opt.key) : position);
        const payload: Record<string, unknown> = {
          email,
          name,
          password,
          position: finalPosition,
        };
        if (botProtectionToken) payload.turnstileToken = botProtectionToken;

        const res = await fetch("/api/auth/register/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || t("auth_register_error_failed"));
          setBotProtectionToken(null);
          turnstileRef.current?.reset();
          return;
        }
        toast.success(t("auth_register_toast_otp_sent"));
        setStep(3);
      } catch {
        setError(t("auth_error_connection"));
        setBotProtectionToken(null);
        turnstileRef.current?.reset();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setError("");
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || t("auth_register_error_google"));
          return;
        }
        setUser(data.user);
        toast.success(t("auth_register_toast_google_success"));
        router.push("/dashboard");
      } catch {
        setError(t("auth_error_connection"));
      } finally {
        setIsLoading(false);
      }
    },
    [router, setUser, t]
  );

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
        setError(data.message || t("auth_register_error_verify"));
        setIsLoading(false);
        return;
      }

      toast.success(t("auth_register_toast_success"));
      setStep(4);
    } catch {
      setError(t("auth_error_connection"));
      setIsLoading(false);
    }
  };

  if (step === 4) {
    return (
      <AuthLayout leftPanel={<ProgressStepsVertical steps={registerSteps} currentStep={4} />} contentMaxWidth="max-w-lg">
        <div className="w-full">
          <div className="mb-4 lg:hidden">
            <ProgressSteps steps={registerSteps} currentStep={4} />
          </div>
          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-4 items-center text-center pb-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">{t("auth_register_success_title")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("auth_register_success_desc")}
                </CardDescription>
              </div>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Đăng nhập</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  if (step === 3) {
    return (
      <AuthLayout leftPanel={<ProgressStepsVertical steps={registerSteps} currentStep={3} />} contentMaxWidth="max-w-lg">
        <div className="w-full">
          <div className="mb-4 lg:hidden">
            <ProgressSteps steps={registerSteps} currentStep={3} />
          </div>
          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-4 items-center text-center pb-2">
              <div>
                <CardTitle className="text-2xl font-bold">{t("auth_register_otp_title")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("auth_register_otp_desc")} <strong>{t("auth_register_otp_check_spam")}</strong>
                </CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleVerifyOTP}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
                )}
                <div className="space-y-2">
                  <Label>{t("auth_email")}</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">{t("auth_register_otp_label")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder={t("auth_register_otp_placeholder")}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">{t("auth_register_otp_valid")}</p>
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
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                >
                  {t("auth_register_back")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout leftPanel={<ProgressStepsVertical steps={registerSteps} currentStep={step} />} contentMaxWidth="max-w-lg">
      <div className="w-full">
        <div className="mb-4 lg:hidden">
          <ProgressSteps steps={registerSteps} currentStep={step} />
        </div>
        <Card className="border-0 shadow-none">
          <CardHeader className="space-y-4 items-center text-center pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">
                {step === 1 ? t("auth_register_title_step1") : t("auth_register_title_step2")}
              </CardTitle>
              <CardDescription className="mt-1">
                {step === 1
                  ? t("auth_register_subtitle_step1")
                  : t("auth_register_subtitle_step2")}
              </CardDescription>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive mx-6">{error}</div>
            )}

            {step === 1 && (
              <>
                <CardContent className="space-y-4 pt-0">
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
                </CardContent>
                <CardContent className="space-y-4 pt-0">
                  <AccountTypeSelector value={accountType} onChange={setAccountType} />
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth_email")} <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="password">{t("auth_password")} <span className="text-destructive">*</span></Label>
                    <PasswordRequirements password={password} open={showPasswordRequirements} onOpenChange={setShowPasswordRequirements}>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth_register_password_placeholder")}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (e.target.value.length > 0) setShowPasswordRequirements(true);
                          }}
                          onFocus={() => setShowPasswordRequirements(true)}
                          onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          disabled={isLoading}
                          className="pr-10"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </PasswordRequirements>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("auth_register_confirm_password")} <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t("auth_register_confirm_password_placeholder")}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 flex-nowrap">
                    <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c === true)} disabled={isLoading} className="shrink-0 mt-0" />
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed flex items-center gap-1 flex-nowrap min-w-0">
                      <span className="whitespace-nowrap">{t("auth_register_agree_terms")}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="underline hover:text-blue-500 bg-transparent border-0 cursor-pointer shrink-0">
                        {t("auth_register_terms_link")}
                      </button>
                      <span className="whitespace-nowrap">{t("auth_register_and")}</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }} className="underline hover:text-blue-500 bg-transparent border-0 cursor-pointer shrink-0">
                        {t("auth_register_privacy_link")}
                      </button>
                      <span className="whitespace-nowrap">{t("auth_register_terms_suffix")}</span>
                    </Label>
                  </div>
                </CardContent>
              </>
            )}

            {step === 2 && (
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth_name")} <span className="text-destructive">*</span></Label>
                    <Input id="name" type="text" placeholder={t("auth_name_placeholder")} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">{t("auth_register_position")} <span className="text-destructive">*</span></Label>
                  <Select onValueChange={setPosition} value={position} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("auth_register_position_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{t(opt.key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {position === "other" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="customPosition">{t("auth_register_position_other")} <span className="text-destructive">*</span></Label>
                    <Input id="customPosition" placeholder="Nhập chức vụ" value={customPosition} onChange={(e) => setCustomPosition(e.target.value)} disabled={isLoading} required />
                  </div>
                )}

                {step === 2 && (
                  <TurnstileWidget
                    ref={turnstileRef}
                    onSuccess={setBotProtectionToken}
                    onExpire={() => setBotProtectionToken(null)}
                    onError={() => setBotProtectionToken(null)}
                    className="flex justify-center"
                  />
                )}
              </CardContent>
            )}

            <CardFooter className="flex flex-col gap-4">
              <StepNav
                currentStep={step}
                totalSteps={4}
                onPrevious={step > 1 ? () => setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : undefined}
                previousHref={step === 1 ? "/login" : undefined}
                onNext={step < 3 ? handleNext : undefined}
                nextLabel={step === 2 ? t("auth_register_send_otp") : t("auth_register_next")}
                nextLoading={step === 2 && isLoading}
                nextDisabled={step === 2 && isStep2SubmitBlocked}
              />
            </CardFooter>
          </div>
        </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; {new Date().getFullYear()} Lawzy. {t("auth_footer_copyright")}.
      </p>
      </div>

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
    </AuthLayout>
  );
}
