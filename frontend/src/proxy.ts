import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isProtectedPath,
  isAuthPage,
  hasAuthCookie,
  loginPathWithReturn,
} from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasAuthCookie(request);

  if (isProtectedPath(pathname) && !authenticated) {
    return NextResponse.redirect(
      new URL(loginPathWithReturn(pathname), request.url)
    );
  }

  if (isAuthPage(pathname) && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
