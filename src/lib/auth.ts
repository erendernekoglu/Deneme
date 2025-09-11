export function getAuthToken(): string | null {
  try {
    const session = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    if (session) return session;
    const local = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    return local;
  } catch {
    return null;
  }
}

export function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}
