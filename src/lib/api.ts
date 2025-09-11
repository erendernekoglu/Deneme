import getAuthToken from './getAuthToken';

// Default API base uses Vite dev proxy (see vite.config.ts)
// Override with VITE_API_BASE in production if needed.
const BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function handle<T>(res: Response): Promise<T | undefined> {
  if (res.ok) {
    // 204 gibi gövdessiz cevaplar için koruma
    if (res.status === 204) return undefined;
    return res.json();
  }
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.error || data?.message || JSON.stringify(data);
  } catch {
    detail = await res.text().catch(() => '');
  }
  throw new Error(`${res.status} ${res.statusText}${detail ? ` - ${detail}` : ''}`);
}

export const api = {
  async get<T>(p: string): Promise<T | undefined> {
    const r = await fetch(`${BASE}${p}`, { headers: withAuth({ Accept: 'application/json' }) });
    return handle<T>(r);
  },
  async post<T>(p: string, body: unknown): Promise<T | undefined> {
    const r = await fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
    });
    return handle<T>(r);
  },
  async put<T>(p: string, body: unknown): Promise<T | undefined> {
    const r = await fetch(`${BASE}${p}`, {
      method: 'PUT',
      headers: withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
    });
    return handle<T>(r);
  },
  async patch<T>(p: string, body: unknown): Promise<T | undefined> {
    const r = await fetch(`${BASE}${p}`, {
      method: 'PATCH',
      headers: withAuth({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify(body),
    });
    return handle<T>(r);
  },
  async del(p: string): Promise<void> {
    const r = await fetch(`${BASE}${p}`, {
      method: 'DELETE',
      headers: withAuth({ Accept: 'application/json' }),
    });
    await handle<void>(r);
  },
};

// Reports helpers
export const reports = {
  async summary(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/reports/summary?${qs}`);
  },
};

function withAuth(init: Record<string, string>) {
  const token = getAuthToken();
  return token ? { ...init, Authorization: `Bearer ${token}` } : init;
}
