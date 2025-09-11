import React from 'react';
import { api } from '../lib/api';

type LoginResponse = {
  token: string;
  user: { id: string; email: string; fullName: string; role: 'ADMIN' | 'EMPLOYEE' };
};

export interface LoginProps {
  onSuccess: (auth: LoginResponse) => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = React.useState('admin@example.com');
  const [password, setPassword] = React.useState('admin123');
  const [remember, setRemember] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      if (!res) throw new Error('Sunucu yanıtı yok');
      try {
        if (remember) {
          localStorage.setItem('token', res.token);
          try { sessionStorage.removeItem('token'); } catch {}
        } else {
          sessionStorage.setItem('token', res.token);
          try { localStorage.removeItem('token'); } catch {}
        }
      } catch {}
      onSuccess(res);
    } catch (err: any) {
      setError(err?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Yönetici Girişi</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Admin paneline erişim için giriş yapın</p>
        {error ? (
          <div className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-2">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="••••••••"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Beni hatırla
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
