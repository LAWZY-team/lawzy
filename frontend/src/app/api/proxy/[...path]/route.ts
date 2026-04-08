import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/server/get-backend-base-url";

/** Allow long-running uploads through the dev/proxy path. */
export const maxDuration = 120;

function isJsonRequestContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct.includes("application/json") || ct.includes("+json");
}

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const backendBase = getBackendBaseUrl();
  const { path } = await params;
  const backendPath = `/${path.join("/")}`;
  const searchParams = req.nextUrl.searchParams.toString();
  const url = `${backendBase}${backendPath}${searchParams ? `?${searchParams}` : ""}`;

  const incomingContentType = req.headers.get("Content-Type");

  const headers = new Headers();
  if (incomingContentType) headers.set("Content-Type", incomingContentType);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const authorization = req.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const fetchOpts: RequestInit = { method: req.method, headers };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (isJsonRequestContentType(incomingContentType)) {
      try {
        const body = await req.text();
        if (body) fetchOpts.body = body;
      } catch {
        /* no body */
      }
    } else {
      // multipart, file uploads, form-urlencoded, octet-stream — preserve raw bytes
      headers.delete("Content-Type");
      fetchOpts.body = await req.arrayBuffer();
      if (incomingContentType) headers.set("Content-Type", incomingContentType);
      headers.delete("Content-Length");
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(url, fetchOpts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream unreachable";
    let upstreamHost = backendBase;
    try {
      upstreamHost = new URL(backendBase).host;
    } catch {
      /* keep raw */
    }
    return NextResponse.json(
      {
        statusCode: 502,
        message: `Proxy error: ${message}`,
        upstreamHost,
        path: backendPath,
      },
      { status: 502 }
    );
  }

  const resHeaders = new Headers();
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      resHeaders.append(key, value);
    } else if (key.toLowerCase() !== "transfer-encoding") {
      resHeaders.set(key, value);
    }
  });

  const responseBody = await backendRes.arrayBuffer();

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
