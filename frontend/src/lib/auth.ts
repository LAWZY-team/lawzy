export const AUTH_COOKIE = "auth_session" as const;
export const DEFAULT_AFTER_LOGIN = "/clm/dashboard" as const;
export const LOGIN_PATH = "/login" as const;

export const PROTECTED_PREFIXES = [
  "/lpms",
  "/clm/dashboard",
  "/clm/documents",
  "/clm/editor",
  "/clm/fields",
  "/clm/settings",
  "/clm/templates",
  "/clm/workspace",
  "/clm/files",
  "/payment",
  "/clm/sources",
  "/clm/admin",
] as const;

export const AUTH_PAGE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function hasAuthCookie(request: { cookies: { has: (name: string) => boolean } }): boolean {
  return request.cookies.has(AUTH_COOKIE);
}

export function loginPathWithReturn(returnPath?: string): string {
  if (!returnPath || returnPath === LOGIN_PATH) return LOGIN_PATH;
  return `${LOGIN_PATH}?returnUrl=${encodeURIComponent(returnPath)}`;
}

export function parseReturnUrl(
  params: { get: (k: string) => string | null } | Record<string, string | null>
): string {
  const get = (k: string) =>
    typeof (params as { get: (k: string) => string | null }).get === "function"
      ? (params as { get: (k: string) => string | null }).get(k)
      : (params as Record<string, string | null>)[k];
  return get("returnUrl") ?? get("callbackUrl") ?? DEFAULT_AFTER_LOGIN;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function hasAuthCookieClient(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${AUTH_COOKIE}=`));
}

/** Mirror server auth_session so middleware sees login before client navigation. */
export function markAuthSessionClient(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
}

/**
 * Full-page redirect after login so cookies + middleware stay in sync (avoids LPMS soft-nav races).
 */
export function redirectAfterLogin(returnUrl: string): void {
  markAuthSessionClient();
  window.location.assign(returnUrl);
}

/** Full-page redirect after logout — homepage, not CLM login bounce. */
export function redirectAfterLogout(): void {
  window.location.assign("/");
}
