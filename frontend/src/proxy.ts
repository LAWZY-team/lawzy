import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isProtectedPath,
  isAuthPage,
  hasAuthCookie,
  loginPathWithReturn,
} from "@/lib/auth";

const applyUatNoIndexHeader = (response: NextResponse, host: string): NextResponse => {
  if (!host.includes("uat.")) return response;
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasAuthCookie(request);
  const host = request.headers.get("host") ?? "";

  if (isProtectedPath(pathname) && !authenticated) {
    return applyUatNoIndexHeader(
      NextResponse.redirect(new URL(loginPathWithReturn(pathname), request.url)),
      host
    );
  }

  if (isAuthPage(pathname) && authenticated) {
    return applyUatNoIndexHeader(
      NextResponse.redirect(new URL("/dashboard", request.url)),
      host
    );
  }

  return applyUatNoIndexHeader(NextResponse.next(), host);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
