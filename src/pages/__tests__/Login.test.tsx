import { vi } from 'vitest';
vi.mock('../../lib/api', () => ({
  api: { post: vi.fn() },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { api } from '../../lib/api';
import Login from '../Login';

describe('Login component', () => {
  it('renders form fields', () => {
    render(<Login onSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/E-posta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Şifre/i)).toBeInTheDocument();
  });

  it('submits and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    (api.post as any).mockResolvedValueOnce({
      token: 't',
      user: { id: '1', email: 'e', fullName: 'e', role: 'ADMIN' },
    });
    render(<Login onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText(/E-posta/i), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText(/Şifre/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /giriş yap/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
