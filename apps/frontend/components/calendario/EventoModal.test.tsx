/**
 * EventoModal tests (CAL-02 frontend).
 * Verifies that submitting the modal calls createEvento with origen 'manual'
 * and the entered field values.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventoModal } from './EventoModal';

// Mock the eventos API client
vi.mock('@/lib/api/eventos', () => ({
  createEvento: vi.fn(),
}));

import { createEvento } from '@/lib/api/eventos';

const mockCreateEvento = createEvento as ReturnType<typeof vi.fn>;

describe('EventoModal', () => {
  const onClose = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvento.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      origen: 'manual',
      titulo: 'Reunión de seguimiento',
      fechaInicio: '2026-06-15T09:00:00.000Z',
      mostrarEnCalendario: true,
      activo: true,
      fechaCreacion: '2026-06-06T00:00:00.000Z',
      fechaActualizacion: '2026-06-06T00:00:00.000Z',
      expedienteId: null,
      documentoId: null,
      subtipo: null,
      descripcion: null,
      fechaFin: null,
      color: '#3b82f6',
      usuarioId: '507f1f77bcf86cd799439010',
    });
  });

  it('calls createEvento with origen manual and entered values on submit', async () => {
    render(
      <EventoModal onClose={onClose} onCreated={onCreated} />,
    );

    // Fill in titulo
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Reunión de seguimiento' },
    });

    // Fill in fechaInicio
    fireEvent.change(screen.getByLabelText(/fecha inicio/i), {
      target: { value: '2026-06-15' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /crear/i }));

    await waitFor(() => {
      expect(mockCreateEvento).toHaveBeenCalledTimes(1);
    });

    const call = mockCreateEvento.mock.calls[0][0];
    expect(call.origen).toBe('manual');
    expect(call.titulo).toBe('Reunión de seguimiento');
    expect(call.mostrarEnCalendario).toBe(true);
    expect(call.fechaInicio).toContain('2026-06-15');
  });

  it('calls onCreated and onClose on successful creation', async () => {
    render(
      <EventoModal onClose={onClose} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Evento test' },
    });
    fireEvent.change(screen.getByLabelText(/fecha inicio/i), {
      target: { value: '2026-06-15' },
    });

    fireEvent.click(screen.getByRole('button', { name: /crear/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
