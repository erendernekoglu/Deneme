import { describe, it, expect } from 'vitest';
import { decodeJwt } from '../jwt';

// Helper to create a simple JWT for testing
function createToken(payload: object) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`; // signature not needed for decode
}

describe('decodeJwt', () => {
  it('returns payload for valid token', () => {
    const token = createToken({ sub: '123', role: 'ADMIN' });
    expect(decodeJwt(token)).toEqual({ sub: '123', role: 'ADMIN' });
  });

  it('returns null for invalid token', () => {
    expect(decodeJwt('invalid.token')).toBeNull();
  });
});
