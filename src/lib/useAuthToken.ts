import { getAuthToken } from './auth';

export function useAuthToken(): string | null {
  return getAuthToken();
}

export default useAuthToken;
