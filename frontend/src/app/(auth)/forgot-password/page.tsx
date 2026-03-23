"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";
import { BenefitsPanel } from "@/components/auth/benefits-panel";
import { useT } from "@/components/i18n-provider";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || t("auth_error_connection"));
        setIsLoading(false);
        return;
      }

      setIsSent(true);
    } catch {
      setError(t("auth_error_connection"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <AuthLayout leftPanel={<BenefitsPanel />}>
        <Card className="border-0 shadow-none">
          <CardHeader className="space-y-4 items-center text-center pb-2">
            <div>
              <CardTitle className="text-2xl font-bold">{t("auth_forgot_success_title")}</CardTitle>
              <CardDescription className="mt-2">
                {t("auth_forgot_success_desc", { email })}
                <br />
                <strong>{t("auth_forgot_check_spam")}</strong>
              </CardDescription>
            </div>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth_forgot_back")}
              </Link>
            </Button>
          </CardFooter>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-6">
          &copy; {new Date().getFullYear()} Lawzy. {t("auth_footer_copyright")}.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout leftPanel={<BenefitsPanel />}>
      <Card className="border-0 shadow-none">
        <CardHeader className="space-y-4 items-center text-center pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">{t("auth_forgot_title")}</CardTitle>
            <CardDescription className="mt-1">
              {t("auth_forgot_subtitle")}
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth_forgot_back")}
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; {new Date().getFullYear()} Lawzy. {t("auth_footer_copyright")}.
      </p>
    </AuthLayout>
  );
}
