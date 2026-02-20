import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const backendPath = `/${path.join('/')}`;
  const searchParams = req.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}${backendPath}${searchParams ? `?${searchParams}` : ''}`;

  const headers = new Headers();
  const contentType = req.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);

  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const fetchOpts: RequestInit = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (contentType?.includes('multipart/form-data')) {
      headers.delete('Content-Type');
      fetchOpts.body = await req.arrayBuffer();
      headers.set('Content-Type', contentType);
    } else {
      try {
        const body = await req.text();
        if (body) fetchOpts.body = body;
      } catch {
        // no body
      }
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
