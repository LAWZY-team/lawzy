export const AUTH_COOKIE = "auth_session" as const;
export const LOGIN_PRODUCT_COOKIE = "login_product" as const;
export const DEFAULT_AFTER_LOGIN = "/clm/dashboard" as const;
export const LOGIN_PATH = "/login" as const;

export const LOGIN_PRODUCTS = ["clm", "lpms", "lawfirm"] as const;
export type LoginProduct = (typeof LOGIN_PRODUCTS)[number];

export const PROTECTED_PREFIXES = [
  "/lawfirm",
  "/lpms",
  "/clm/dashboard",
  "/clm/documents",
  "/clm/editor",
  "/clm/fields",
  "/clm/settings",
  "/clm/templates",
  "/clm/workspace",
  "/clm/files",
  "/clm/payment",
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
  const product = inferLoginProduct(returnPath);
  const params = new URLSearchParams({ returnUrl: returnPath });
  if (product) params.set("product", product);
  return `${LOGIN_PATH}?${params.toString()}`;
}

export function registerPathWithReturn(returnPath?: string): string {
  if (!returnPath) return "/register";
  const safeReturnPath = isSafeReturnUrl(returnPath) ? returnPath : DEFAULT_AFTER_LOGIN;
  const product = inferLoginProduct(safeReturnPath);
  const params = new URLSearchParams({ returnUrl: safeReturnPath });
  if (product) params.set("product", product);
  return `/register?${params.toString()}`;
}

export function inferLoginProduct(path: string): LoginProduct | null {
  if (path.startsWith("/lawfirm")) return "lawfirm";
  if (path.startsWith("/lpms")) return "lpms";
  if (path.startsWith("/clm")) return "clm";
  return null;
}

export function isLawfirmLoginContext(returnUrl: string): boolean {
  return inferLoginProduct(returnUrl) === "lawfirm";
}

export function parseLoginProduct(
  params: { get: (k: string) => string | null } | Record<string, string | null>,
): LoginProduct | null {
  const get = (k: string) =>
    typeof (params as { get: (k: string) => string | null }).get === "function"
      ? (params as { get: (k: string) => string | null }).get(k)
      : (params as Record<string, string | null>)[k];
  const raw = get("product");
  if (raw && LOGIN_PRODUCTS.includes(raw as LoginProduct)) {
    return raw as LoginProduct;
  }
  const returnUrl = get("returnUrl") ?? get("callbackUrl");
  if (returnUrl) return inferLoginProduct(returnUrl);
  return null;
}

export function parseReturnUrl(
  params: { get: (k: string) => string | null } | Record<string, string | null>
): string {
  const get = (k: string) =>
    typeof (params as { get: (k: string) => string | null }).get === "function"
      ? (params as { get: (k: string) => string | null }).get(k)
      : (params as Record<string, string | null>)[k];
  const raw = get("returnUrl") ?? get("callbackUrl") ?? DEFAULT_AFTER_LOGIN;
  return isSafeReturnUrl(raw) ? raw : DEFAULT_AFTER_LOGIN;
}

/** Reject open redirects; allow same-origin relative paths only. */
export function isSafeReturnUrl(path: string): boolean {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("://") || path.includes("\\")) return false;
  return true;
}

export function resolvePostLoginRedirect({
  returnUrl,
  productChoice = "clm",
}: {
  returnUrl: string;
  productChoice?: "clm" | "lpms";
}): string {
  const safe = isSafeReturnUrl(returnUrl) ? returnUrl : DEFAULT_AFTER_LOGIN;
  if (
    safe !== "/" &&
    safe !== LOGIN_PATH &&
    (safe.startsWith("/clm") || safe.startsWith("/lpms") || safe.startsWith("/lawfirm"))
  ) {
    return safe;
  }
  return productChoice === "lpms" ? "/lpms/dashboard" : "/clm/dashboard";
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${LOGIN_PRODUCT_COOKIE}=; path=/; max-age=0`;
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
