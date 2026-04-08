import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/server/get-backend-base-url";

/** @deprecated Use /api/help-center/contact instead. Proxies to backend for backward compatibility. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, message } = body;
    if (!name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const res = await fetch(`${getBackendBaseUrl()}/help-center/contact`, {
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
