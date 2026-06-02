import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ContactoVinculado } from '@lexscribe/shared-types';
import { ContactosVinculadosTab } from '../../components/expedientes/ContactosVinculadosTab';
import { unlinkContacto } from '../../lib/api/expedientes';
import { listContactos } from '../../lib/api/contactos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../lib/api/expedientes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/expedientes')>();
  return { ...actual, unlinkContacto: vi.fn(), linkContacto: vi.fn() };
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

const contactos: ContactoVinculado[] = [
  { contactoId: '507f1f77bcf86cd799439011', rol: 'cliente' },
  { contactoId: '507f1f77bcf86cd799439011', rol: 'vendedor' },
];

describe('ContactosVinculadosTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listContactos).mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('renders empty state when no contactos', () => {
    renderWithQC(<ContactosVinculadosTab expedienteId="exp1" contactos={[]} />);
    expect(screen.getByText('Sin contactos vinculados')).toBeTruthy();
  });

  it('renders a row per vinculo with rol badge', () => {
    renderWithQC(<ContactosVinculadosTab expedienteId="exp1" contactos={contactos} />);
    expect(screen.getByText('cliente')).toBeTruthy();
    expect(screen.getByText('vendedor')).toBeTruthy();
  });

  it('calls unlinkContacto when Desasociar clicked', async () => {
    vi.mocked(unlinkContacto).mockResolvedValueOnce(undefined);
    renderWithQC(<ContactosVinculadosTab expedienteId="exp1" contactos={contactos} />);
    fireEvent.click(screen.getAllByText('Desasociar')[0]);
    await waitFor(() => {
      expect(unlinkContacto).toHaveBeenCalledWith('exp1', '507f1f77bcf86cd799439011', 'cliente');
    });
  });

  it('opens and closes the asociar modal', () => {
    renderWithQC(<ContactosVinculadosTab expedienteId="exp1" contactos={[]} />);
    fireEvent.click(screen.getByText('Asociar contacto'));
    expect(screen.getByText('Selecciona un contacto')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Selecciona un contacto')).toBeNull();
  });
});
