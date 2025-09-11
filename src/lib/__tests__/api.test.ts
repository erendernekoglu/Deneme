import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

vi.mock('../useAuthToken', () => ({ default: () => 'token123' }));

describe('api helpers', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
  });

  it('handles successful get', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const res = await api.get('/test');
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/test', {
      headers: { Accept: 'application/json', Authorization: 'Bearer token123' },
    });
  });

  it('throws on error response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Nope' }),
    });
    await expect(api.get('/bad')).rejects.toThrow('400 Bad Request - Nope');
  });

  it('returns undefined for 204 delete', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    await expect(api.del('/item')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/item', {
      method: 'DELETE',
      headers: { Accept: 'application/json', Authorization: 'Bearer token123' },
    });
  });
});
