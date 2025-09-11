export function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default decodeJwt;
