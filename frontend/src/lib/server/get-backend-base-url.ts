/**
 * Base URL for server-side proxy routes to the Nest backend.
 * Trailing slashes are stripped. Defaults to 127.0.0.1 (not "localhost")
 * to reduce Windows/Node IPv6 (::1) vs IPv4 connection issues when the API
 * only listens on IPv4.
 *
 * If env uses `http://localhost:PORT`, hostname is rewritten to 127.0.0.1
 * so Next.js server-side fetch still works when .env.local sets localhost.
 */
export function getBackendBaseUrl(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:5000";
  const trimmed = raw.replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    if (u.hostname === "localhost" || u.hostname === "::1") {
      u.hostname = "127.0.0.1";
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return trimmed;
  }
}
