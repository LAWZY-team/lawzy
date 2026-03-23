import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** @deprecated Use /api/help-center/contact instead. Proxies to backend for backward compatibility. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, message } = body;
    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const res = await fetch(`${BACKEND_URL}/help-center/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, company, message }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
