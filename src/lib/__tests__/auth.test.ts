import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAuthToken, decodeJwt } from '../auth';

describe('getAuthToken', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('reads token from sessionStorage', () => {
    sessionStorage.setItem('token', 'sess');
    localStorage.setItem('token', 'local');
    expect(getAuthToken()).toBe('sess');
  });

  it('falls back to localStorage', () => {
    localStorage.setItem('token', 'local');
    expect(getAuthToken()).toBe('local');
  });

  it('returns null when no token', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('handles storage errors', () => {
    const spy = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(getAuthToken()).toBeNull();
    spy.mockRestore();
  });
});

describe('decodeJwt', () => {
  it('decodes valid token', () => {
    const payload = { sub: '1', role: 'ADMIN', email: 'a@b.com' };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `header.${encoded}.sig`;
    expect(decodeJwt(token)).toEqual(payload);
  });

  it('returns null for invalid token', () => {
    expect(decodeJwt('bad')).toBeNull();
  });
});
