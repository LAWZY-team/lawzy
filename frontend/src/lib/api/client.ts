const API_BASE = '/api/proxy';

let isRefreshing = false;
let refreshSubscribers: ((error: Error | null) => void)[] = [];

function onRefreshed(error: Error | null) {
  refreshSubscribers.forEach((cb) => cb(error));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (error: Error | null) => void) {
  refreshSubscribers.push(cb);
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const execute = () => fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
    ...opts,
  });

  let res = await execute();

  if (res.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh') && typeof window !== 'undefined') {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((error) => {
          if (error) return reject(error);
          resolve(request<T>(path, opts));
        });
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!refreshRes.ok) {
        throw new Error('Phiên đăng nhập hết hạn');
      }

      isRefreshing = false;
      onRefreshed(null);

      // Retry original request
      res = await execute();
    } catch (err) {
      isRefreshing = false;
      onRefreshed(err as Error);
      
      // Notify application of auth failure
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lawzy:unauthorized'));
      }
      
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `API error 401`);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }

  return res.json();
}

function requestRaw(path: string, opts?: RequestInit) {
  return fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...opts,
  });
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Upload error ${res.status}`);
      }
      return res.json() as Promise<T>;
    }),
  raw: requestRaw,
};
