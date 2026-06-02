import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AsociarContactoModal } from '../../components/expedientes/AsociarContactoModal';
import { linkContacto, ApiError } from '../../lib/api/expedientes';
import { listContactos } from '../../lib/api/contactos';

vi.mock('../../lib/api/expedientes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/expedientes')>();
  return { ...actual, linkContacto: vi.fn() };
});

vi.mock('../../lib/api/contactos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/contactos')>();
  return { ...actual, listContactos: vi.fn() };
});

function renderWithQC(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleContacto = {
  _id: '507f1f77bcf86cd799439011',
  usuarioId: 'u1',
  tipo: 'fisica' as const,
  tipologia: 'cliente' as const,
  nombre: 'Ana Lopez',
  parametros: {},
  activo: true,
  fechaInactivacion: null,
  fechaCreacion: '2026-01-01T00:00:00Z',
  fechaActualizacion: '2026-01-01T00:00:00Z',
};

describe('AsociarContactoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listContactos).mockResolvedValue({
      items: [sampleContacto],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('renders nothing when open is false', () => {
    renderWithQC(<AsociarContactoModal expedienteId="exp1" open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Asociar contacto')).toBeNull();
  });

  it('shows inline 409 error when contacto already linked', async () => {
    vi.mocked(linkContacto).mockRejectedValueOnce(new ApiError('CONFLICT', 'duplicate', 409));
    renderWithQC(<AsociarContactoModal expedienteId="exp1" open onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Ana Lopez')).toBeTruthy());

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '507f1f77bcf86cd799439011' } });
    const rolInput = screen.getByPlaceholderText(/cliente, vendedor/i);
    fireEvent.change(rolInput, { target: { value: 'cliente' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/ya esta vinculado/i);
    });
  });

  it('calls linkContacto and closes on success', async () => {
    vi.mocked(linkContacto).mockResolvedValueOnce({} as never);
    const onClose = vi.fn();
    renderWithQC(<AsociarContactoModal expedienteId="exp1" open onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('Ana Lopez')).toBeTruthy());

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '507f1f77bcf86cd799439011' } });
    const rolInput = screen.getByPlaceholderText(/cliente, vendedor/i);
    fireEvent.change(rolInput, { target: { value: 'cliente' } });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(linkContacto).toHaveBeenCalledWith('exp1', {
        contactoId: '507f1f77bcf86cd799439011',
        rol: 'cliente',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
