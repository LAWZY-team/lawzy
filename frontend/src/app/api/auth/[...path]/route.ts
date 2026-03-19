import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const backendPath = `/auth/${path.join('/')}`;
  const url = `${BACKEND_URL}${backendPath}`;

  const headers = new Headers();
  headers.set('Content-Type', req.headers.get('Content-Type') || 'application/json');

  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const fetchOpts: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const body = await req.text();
      if (body) fetchOpts.body = body;
    } catch {
      // no body
    }
  }

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

  // If we hit a 401 Unauthorized globally (or specifically on /auth/me), 
  // explicitly clear the auth_session cookie so NextJS middleware stops redirecting to /dashboard.
  if (backendRes.status === 401) {
    resHeaders.append('Set-Cookie', 'auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
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
