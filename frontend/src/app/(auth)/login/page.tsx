"use client";

import { Suspense, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AccountTypeSelector, type AccountType } from "@/components/auth/account-type-selector";
import { BenefitsPanel } from "@/components/auth/benefits-panel";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { isBotProtectionEnabled } from "@/lib/bot-protection";
import { parseReturnUrl } from "@/lib/auth";
import { useT } from "@/components/i18n-provider";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = parseReturnUrl(searchParams);
  const { t } = useT();
  const { setUser } = useAuthStore();
  const setLoginScopedWorkspaceId = useWorkspaceStore((s) => s.setLoginScopedWorkspaceId);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [botProtectionToken, setBotProtectionToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const isBusinessBlocked = accountType === "business" && !companyCode.trim();
  const isSubmitBlocked =
    (isBotProtectionEnabled && !botProtectionToken) || isBusinessBlocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isSubmitBlocked) {
      setError(t("auth_error_bot_protection"));
      return;
    }
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = { email, password };
      if (accountType === "business" && companyCode.trim()) {
        payload.accountType = "business";
        payload.companyCode = companyCode.trim();
      }
      if (botProtectionToken) payload.turnstileToken = botProtectionToken;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("auth_error_credentials"));
        setBotProtectionToken(null);
        turnstileRef.current?.reset();
        setIsLoading(false);
        return;
      }

      setUser(data.user);
      if (data.activeWorkspaceId) {
        setLoginScopedWorkspaceId(data.activeWorkspaceId);
      }
      toast.success(t("auth_toast_success"));
      router.push(returnUrl);
    } catch {
      setError(t("auth_error_connection"));
      setBotProtectionToken(null);
      turnstileRef.current?.reset();
      setIsLoading(false);
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
          setError(data.message || t("auth_error_google"));
          return;
        }
        setUser(data.user);
        toast.success(t("auth_toast_success"));
        router.push(returnUrl);
      } catch {
        setError(t("auth_error_connection"));
      } finally {
        setIsLoading(false);
      }
    },
    [returnUrl, router, setUser, t]
  );

  return (
    <AuthLayout leftPanel={<BenefitsPanel />}>
      <Card className="border-0 shadow-none">
        <CardHeader className="space-y-4 items-center text-center pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">{t("auth_login_title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("auth_login_subtitle")}
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <AccountTypeSelector value={accountType} onChange={setAccountType} />
            {accountType === "business" && (
              <div className="space-y-2">
                <Label htmlFor="companyCode">{t("auth_company_code")}</Label>
                <Input
                  id="companyCode"
                  type="text"
                  placeholder={t("auth_company_code_placeholder")}
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required={accountType === "business"}
                  autoComplete="organization"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {t("auth_company_code_hint")}
                </p>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth_password")}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("auth_forgot_password")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth_password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={setBotProtectionToken}
              onExpire={() => setBotProtectionToken(null)}
              onError={() => setBotProtectionToken(null)}
              className="flex justify-center"
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full mt-3" size="lg" disabled={isLoading || isSubmitBlocked}>
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
              <Link href="/register" className="text-primary font-medium hover:underline">
                {t("auth_register_now")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; {new Date().getFullYear()} Lawzy. {t("auth_footer_copyright")}.
      </p>
    </AuthLayout>
  );
}
