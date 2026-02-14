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
  const res = await fetch(`${getBackendBaseUrl()}/public-shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error('Failed to create share')
  return (await res.json()) as { token: string }
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

