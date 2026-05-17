import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactoDetailPage from '../../app/(app)/contactos/[id]/page';
import { getContacto, updateContacto } from '../../lib/api/contactos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../lib/api/contactos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/contactos')>();
  return {
    ...actual,
    getContacto: vi.fn(),
    updateContacto: vi.fn(),
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

describe('ContactoDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows API errors inline when contact update fails', async () => {
    vi.mocked(getContacto).mockResolvedValueOnce({
      _id: 'contacto-1',
      usuarioId: 'usuario-1',
      tipo: 'fisica',
      tipologia: 'cliente',
      nombre: 'Ana Lopez',
      parametros: {},
      activo: true,
      fechaInactivacion: null,
      fechaCreacion: '2026-01-01T00:00:00Z',
      fechaActualizacion: '2026-01-01T00:00:00Z',
      expedientesVinculados: [],
    });
    vi.mocked(updateContacto).mockRejectedValueOnce(new Error('Unauthorized'));

    renderWithQueryClient(<ContactoDetailPage params={{ id: 'contacto-1' }} />);

    const nombreInput = await screen.findByDisplayValue('Ana Lopez');
    fireEvent.change(nombreInput, {
      target: { value: 'Ana Lopez Actualizada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Error: Unauthorized',
      );
    });
  });
});
