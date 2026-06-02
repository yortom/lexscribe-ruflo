/**
 * InsertarClausulaModal tests.
 * Verifies Phase 4 clausula library filter + insertClausulaAndRenumber integration (CLAU-04).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InsertarClausulaModal } from '../../components/plantillas/InsertarClausulaModal';
import { listClausulas } from '../../lib/api/clausulas';

vi.mock('../../lib/api/clausulas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api/clausulas')>();
  return { ...actual, listClausulas: vi.fn() };
});

// Mock useDebounce to return the value immediately (no delay in tests)
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (val: unknown) => val,
}));

function renderWithQC(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleClausula = {
  _id: 'c1',
  usuarioId: 'u1',
  nombre: 'Pago aplazado',
  texto: 'El pago se realizará en plazos mensuales.',
  labels: ['pago'],
  activo: true,
  fechaInactivacion: null,
  fechaCreacion: '2026-01-01T00:00:00Z',
  fechaActualizacion: '2026-01-01T00:00:00Z',
};

describe('InsertarClausulaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listClausulas).mockResolvedValue({
      items: [sampleClausula],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('renders the modal with filter input', async () => {
    renderWithQC(
      <InsertarClausulaModal
        contenido="CLÁUSULA PRIMERA.- Objeto"
        afterNumero={1}
        onInsert={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByPlaceholderText(/filtrar por label/i)).toBeTruthy();
  });

  it('shows clausula from library list', async () => {
    renderWithQC(
      <InsertarClausulaModal
        contenido="CLÁUSULA PRIMERA.- Objeto"
        afterNumero={1}
        onInsert={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Pago aplazado')).toBeTruthy();
    });
  });

  it('calls onInsert with renumbered text when Insertar clicked', async () => {
    const onInsert = vi.fn();
    const contenido = 'CLÁUSULA PRIMERA.- Objeto';
    renderWithQC(
      <InsertarClausulaModal
        contenido={contenido}
        afterNumero={1}
        onInsert={onInsert}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Pago aplazado')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Insertar'));

    expect(onInsert).toHaveBeenCalledOnce();
    const resultado: string = onInsert.mock.calls[0][0];
    // The original PRIMERA stays and the new SEGUNDA is inserted after
    expect(resultado).toContain('CLÁUSULA SEGUNDA.-');
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    renderWithQC(
      <InsertarClausulaModal
        contenido=""
        afterNumero={0}
        onInsert={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });
});
