import React from 'react';
import useAuthToken from './useAuthToken';
import { decodeJwt } from './auth';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'EMPLOYEE';
} | null;

function parseUser(token: string | null): AuthUser {
  if (!token) return null;
  const p = decodeJwt(token);
  if (p && (p.role === 'ADMIN' || p.role === 'EMPLOYEE') && p.sub) {
    return { id: String(p.sub), email: p.email, fullName: p.fullName ?? p.email, role: p.role };
  }
  return null;
}

export function useAuth() {
  const token = useAuthToken();
  const [user, setUser] = React.useState<AuthUser>(() => parseUser(token));

  React.useEffect(() => {
    setUser(parseUser(token));
  }, [token]);

  const logout = React.useCallback(() => {
    try {
      sessionStorage.removeItem('token');
    } catch {}
    try {
      localStorage.removeItem('token');
    } catch {}
    setUser(null);
  }, []);

  return { user, logout } as const;
}

export default useAuth;

