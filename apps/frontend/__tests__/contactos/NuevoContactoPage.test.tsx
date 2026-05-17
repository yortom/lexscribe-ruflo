import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NuevoContactoPage from '../../app/(app)/contactos/nuevo/page';
import { createContacto } from '../../lib/api/contactos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../lib/api/contactos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/contactos')>();
  return {
    ...actual,
    createContacto: vi.fn(),
  };
});

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('NuevoContactoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows API errors inline when contact creation fails', async () => {
    vi.mocked(createContacto).mockRejectedValueOnce(new Error('Unauthorized'));
    renderWithQueryClient(<NuevoContactoPage />);

    const nombreInput = document.querySelector<HTMLInputElement>(
      'input[name="nombre"]',
    )!;
    fireEvent.change(nombreInput, { target: { value: 'Ana Lopez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear contacto' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Error: Unauthorized',
      );
    });
  });
});
