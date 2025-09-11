export function useAuthToken(): string | null {
  try {
    const session = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;
    if (session) return session;
    const local = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    return local;
  } catch {
    return null;
  }
}

export default useAuthToken;
