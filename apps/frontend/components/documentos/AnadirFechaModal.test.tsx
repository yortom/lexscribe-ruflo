/**
 * AnadirFechaModal tests (CAL-01 frontend).
 * Verifies that submitting the modal calls createEvento with origen='documento',
 * the given documentoId + expedienteId, subtipo, fechaInicio, and mostrarEnCalendario.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnadirFechaModal } from './AnadirFechaModal';

// Mock the eventos API client
vi.mock('@/lib/api/eventos', () => ({
  createEvento: vi.fn(),
}));

import { createEvento } from '@/lib/api/eventos';

const mockCreateEvento = createEvento as ReturnType<typeof vi.fn>;

const FAKE_DOC_ID = '507f1f77bcf86cd799439011';
const FAKE_EXP_ID = '507f1f77bcf86cd799439012';

describe('AnadirFechaModal', () => {
  const onClose = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvento.mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      origen: 'documento',
      documentoId: FAKE_DOC_ID,
      expedienteId: FAKE_EXP_ID,
      titulo: 'fecha_limite',
      subtipo: 'fecha_limite',
      fechaInicio: '2026-06-15T00:00:00.000Z',
      mostrarEnCalendario: true,
      activo: true,
      fechaCreacion: '2026-06-06T00:00:00.000Z',
      fechaActualizacion: '2026-06-06T00:00:00.000Z',
      fechaFin: null,
      color: null,
      descripcion: null,
      usuarioId: '507f1f77bcf86cd799439010',
    });
  });

  it('calls createEvento with origen documento, documentoId, expedienteId, subtipo and fechaInicio', async () => {
    render(
      <AnadirFechaModal
        documentoId={FAKE_DOC_ID}
        expedienteId={FAKE_EXP_ID}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    // Fill in fechaInicio
    fireEvent.change(screen.getByLabelText(/fecha/i), {
      target: { value: '2026-06-15' },
    });

    // Select subtipo
    fireEvent.change(screen.getByLabelText(/tipo/i), {
      target: { value: 'fecha_limite' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockCreateEvento).toHaveBeenCalledTimes(1);
    });

    const call = mockCreateEvento.mock.calls[0][0];
    expect(call.origen).toBe('documento');
    expect(call.documentoId).toBe(FAKE_DOC_ID);
    expect(call.expedienteId).toBe(FAKE_EXP_ID);
    expect(call.subtipo).toBe('fecha_limite');
    expect(call.fechaInicio).toContain('2026-06-15');
    expect(call.mostrarEnCalendario).toBe(true);
  });

  it('calls onCreated and onClose on successful save', async () => {
    render(
      <AnadirFechaModal
        documentoId={FAKE_DOC_ID}
        expedienteId={FAKE_EXP_ID}
        onClose={onClose}
        onCreated={onCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText(/fecha/i), {
      target: { value: '2026-06-20' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
