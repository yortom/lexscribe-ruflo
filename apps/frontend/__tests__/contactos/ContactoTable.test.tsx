import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Contacto } from '@lexscribe/shared-types';
import { ContactoTable } from '../../components/contactos/ContactoTable';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockItems: Contacto[] = [
  {
    _id: '1',
    usuarioId: 'u1',
    tipo: 'fisica',
    tipologia: 'cliente',
    nombre: 'Ana López',
    email: 'ana@test.es',
    parametros: {},
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActualizacion: '2026-01-01T00:00:00Z',
  },
  {
    _id: '2',
    usuarioId: 'u1',
    tipo: 'juridica',
    tipologia: 'parte_contraria',
    nombre: 'Beta SL',
    documentacionFiscal: 'B12345678',
    parametros: {},
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActualizacion: '2026-01-01T00:00:00Z',
  },
  {
    _id: '3',
    usuarioId: 'u1',
    tipo: 'fisica',
    tipologia: 'interesado',
    nombre: 'Carlos Ruiz',
    parametros: {},
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActualizacion: '2026-01-01T00:00:00Z',
  },
];

describe('ContactoTable', () => {
  const defaultProps = {
    items: mockItems,
    total: 3,
    page: 1,
    limit: 20,
    onPageChange: vi.fn(),
    onSearch: vi.fn(),
    onTipologiaChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 rows for 3 items', () => {
    render(<ContactoTable {...defaultProps} />);
    expect(screen.getByText('Ana López')).toBeTruthy();
    expect(screen.getByText('Beta SL')).toBeTruthy();
    expect(screen.getByText('Carlos Ruiz')).toBeTruthy();
  });

  it('renders tipologia column header', () => {
    render(<ContactoTable {...defaultProps} />);
    expect(screen.getByText('Tipologia')).toBeTruthy();
  });

  it('calls onSearch with input value after debounce', async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<ContactoTable {...defaultProps} onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Ana' } });

    // Before debounce fires - not called yet with 'Ana'
    expect(onSearch).not.toHaveBeenCalledWith('Ana');

    // Advance timers past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(onSearch).toHaveBeenCalledWith('Ana');
    vi.useRealTimers();
  });

  it('shows "No hay contactos" when items is empty', () => {
    render(<ContactoTable {...defaultProps} items={[]} total={0} />);
    expect(screen.getByText('No hay contactos')).toBeTruthy();
  });

  it('does not show pagination when totalPages is 1', () => {
    render(<ContactoTable {...defaultProps} total={20} limit={20} />);
    expect(screen.queryByText('Anterior')).toBeNull();
  });
});
