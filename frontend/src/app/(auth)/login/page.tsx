"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_CREDENTIALS = {
  email: "admin@lawzy.vn",
  password: "Lawzy@2026",
};

const ADMIN_USER = {
  userId: "admin-001",
  name: "Admin Lawzy",
  email: "admin@lawzy.vn",
  avatar: "",
  roles: ["admin"],
  workspaceId: "ws-default",
  createdAt: new Date().toISOString(),
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      setUser(ADMIN_USER);
      document.cookie = "auth_session=true; path=/; max-age=86400; SameSite=Lax";
      toast.success("Đăng nhập thành công!");
      router.push("/dashboard");
    } else {
      setError("Email hoặc mật khẩu không đúng");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <Card className="border-0 shadow-xl">
        <CardHeader className="space-y-4 items-center text-center pb-2">
          <Link href="/" className="inline-block">
            <Image src="/lawzy-logo.png" alt="Lawzy" width={120} height={40} priority />
          </Link>
          <div>
            <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
            <CardDescription className="mt-1">
              Đăng nhập để quản lý hợp đồng của bạn
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@lawzy.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
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
              <Link href="/#survey" className="text-primary font-medium hover:underline">
                Đăng ký trải nghiệm
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        &copy; {new Date().getFullYear()} Lawzy. Nền tảng quản lý hợp đồng pháp lý.
      </p>
    </div>
  );
}
