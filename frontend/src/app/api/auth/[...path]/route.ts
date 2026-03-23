import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { shouldVerifyBotProtection } from "@/lib/bot-protection";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

function isAuthPathRequiringBotProtection(path: string[]): boolean {
  if (path.length === 1 && path[0] === "login") return true;
  if (path.length === 2 && path[0] === "register" && path[1] === "request") return true;
  return false;
}

async function validateBotProtectionToken(
  token: string,
  remoteIp?: string | null
): Promise<boolean> {
  if (!TURNSTILE_SECRET || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        ...(remoteIp && { remoteip: remoteIp }),
      }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const backendPath = `/auth/${path.join("/")}`;
  const url = `${BACKEND_URL}${backendPath}`;

  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("Content-Type") || "application/json");

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  let bodyText: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      bodyText = await req.text();
    } catch {
      /* no body */
    }
  }

  if (
    req.method === "POST" &&
    bodyText &&
    shouldVerifyBotProtection &&
    isAuthPathRequiringBotProtection(path)
  ) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ message: "Request không hợp lệ" }, { status: 400 });
    }
    const botToken = typeof parsed.turnstileToken === "string" ? parsed.turnstileToken : undefined;
    if (!botToken) {
      return NextResponse.json({ message: "Xác thực bảo mật thiếu" }, { status: 400 });
    }
    const remoteIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const isValid = await validateBotProtectionToken(botToken, remoteIp);
    if (!isValid) {
      return NextResponse.json({ message: "Xác thực bảo mật thất bại" }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { turnstileToken, ...rest } = parsed;
    bodyText = JSON.stringify(rest);
  }

  const fetchOpts: RequestInit = {
    method: req.method,
    headers,
  };
  if (bodyText) fetchOpts.body = bodyText;

  const backendRes = await fetch(url, fetchOpts);

  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      resHeaders.append(key, value);
    } else if (key.toLowerCase() !== 'transfer-encoding') {
      resHeaders.set(key, value);
    }
  });

  const responseBody = await backendRes.text();

  if (backendRes.status === 401) {
    resHeaders.append(
      "Set-Cookie",
      `${AUTH_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
  }

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx.params);
}
