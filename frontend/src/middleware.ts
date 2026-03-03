import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/documents",
  "/editor",
  "/settings",
  "/templates",
  "/workspace",
  "/files",
  "/payment",
  "/sources",
];

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAuthSession = request.cookies.has("auth_session");

  // Allow guest users to start contract creation flow.
  // Keep other editor routes protected to avoid exposing saved documents.
  if (pathname === "/editor/new" || pathname === "/templates" || pathname === "/documents") {
    return NextResponse.next();
  }

  if (isProtectedPath(pathname) && !hasAuthSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && hasAuthSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
