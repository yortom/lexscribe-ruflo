import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Clausula } from '@lexscribe/shared-types';
import { ClausulaTable } from '../../components/clausulas/ClausulaTable';

const mockItems: Clausula[] = [
  {
    _id: '1',
    usuarioId: 'u1',
    nombre: 'Garantia estandar',
    texto: 'cuerpo',
    labels: ['compraventa', 'garantia'],
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActualizacion: '2026-01-01T00:00:00Z',
  },
  {
    _id: '2',
    usuarioId: 'u1',
    nombre: 'Confidencialidad',
    texto: 'cuerpo2',
    labels: [],
    activo: true,
    fechaInactivacion: null,
    fechaCreacion: '2026-01-02T00:00:00Z',
    fechaActualizacion: '2026-01-02T00:00:00Z',
  },
];

describe('ClausulaTable', () => {
  const defaultProps = {
    items: mockItems,
    total: 2,
    page: 1,
    limit: 20,
    onPageChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders rows for each clausula', () => {
    render(<ClausulaTable {...defaultProps} />);
    expect(screen.getByText('Garantia estandar')).toBeTruthy();
    expect(screen.getByText('Confidencialidad')).toBeTruthy();
  });

  it('calls onEdit with id when Editar clicked', () => {
    const onEdit = vi.fn();
    render(<ClausulaTable {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete with id after confirmation', () => {
    const onDelete = vi.fn();
    render(<ClausulaTable {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getAllByText('Borrar')[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('does not call onDelete when confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = vi.fn();
    render(<ClausulaTable {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getAllByText('Borrar')[0]);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onPageChange when pagination clicked', () => {
    const onPageChange = vi.fn();
    render(
      <ClausulaTable {...defaultProps} total={40} page={1} limit={20} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByText('Siguiente'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows empty message when no items', () => {
    render(<ClausulaTable {...defaultProps} items={[]} total={0} />);
    expect(screen.getByText('No hay clausulas')).toBeTruthy();
  });
});
