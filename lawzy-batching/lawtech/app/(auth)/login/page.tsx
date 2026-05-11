"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "oauth-loading" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const callbackUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`;

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Đã gửi magic link. Vui lòng kiểm tra email để đăng nhập.");
  }

  async function handleGoogleSignIn() {
    setStatus("oauth-loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Lawzy Legal</p>
        <h1 className="mt-2 text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Đăng nhập bằng Google hoặc nhận magic link qua email đã được cấp quyền
          trong Supabase Auth.
        </p>

        <div className="mt-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={status === "oauth-loading" || status === "loading"}
          >
            {status === "oauth-loading" ? "Đang chuyển đến Google..." : "Tiếp tục với Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="h-px flex-1 bg-slate-200" />
            hoặc
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        <form onSubmit={handleMagicLink} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@lawfirm.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                status === "error" ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || status === "oauth-loading"}
          >
            {status === "loading" ? "Đang gửi..." : "Gửi magic link"}
          </Button>
        </form>
      </section>
    </main>
  );
}
