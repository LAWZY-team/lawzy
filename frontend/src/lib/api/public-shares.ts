export interface PublicShareSnapshot {
  title?: string
  html: string
  createdAt: string
}

function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:5000'
}

export async function createPublicShareSnapshot(params: {
  title?: string
  html: string
}): Promise<{ token: string }> {
  // Use proxy so auth cookies are forwarded (same-origin). Only called from client.
  const url =
    typeof window !== 'undefined'
      ? '/api/proxy/public-shares'
      : `${getBackendBaseUrl()}/public-shares`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Failed to create share')
  return (await res.json()) as { token: string }
}

export async function createPublicShareWithAccessCode(params: {
  title?: string
  html: string
  recipientEmail: string
}): Promise<{ token: string; accessCode: string }> {
  const url =
    typeof window !== 'undefined'
      ? '/api/proxy/public-shares/with-access-code'
      : `${getBackendBaseUrl()}/public-shares/with-access-code`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Failed to create guarded share')
  return (await res.json()) as { token: string; accessCode: string }
}

export async function getPublicShareSnapshot(token: string): Promise<PublicShareSnapshot> {
  const res = await fetch(`${getBackendBaseUrl()}/public-shares/${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
  })
  if (!res.ok) throw new Error('Share not found')
  return (await res.json()) as PublicShareSnapshot
}

export async function requestPublicShareOtp(params: {
  token: string
  email: string
  accessCode: string
}): Promise<void> {
  const url =
    typeof window !== 'undefined'
      ? `/api/proxy/public-shares/${encodeURIComponent(params.token)}/request-otp`
      : `${getBackendBaseUrl()}/public-shares/${encodeURIComponent(params.token)}/request-otp`

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email, accessCode: params.accessCode }),
  })
  if (!res.ok) {
    throw new Error('Failed to request OTP')
  }
}

export async function verifyPublicShareOtp(params: {
  token: string
  email: string
  otp: string
}): Promise<void> {
  const url =
    typeof window !== 'undefined'
      ? `/api/proxy/public-shares/${encodeURIComponent(params.token)}/verify-otp`
      : `${getBackendBaseUrl()}/public-shares/${encodeURIComponent(params.token)}/verify-otp`

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email, otp: params.otp }),
  })
  if (!res.ok) {
    throw new Error('Failed to verify OTP')
  }
}

export async function getGuardedPublicShareContent(token: string): Promise<PublicShareSnapshot> {
  const url = `${getBackendBaseUrl()}/public-shares/${encodeURIComponent(token)}/content`
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
  })
  if (!res.ok) throw new Error('Share not found or not authorized')
  return (await res.json()) as PublicShareSnapshot
}

