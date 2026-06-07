/**
 * CalendarioView tests (CAL-03 frontend).
 * Verifies that tileContent renders event dots on days with events and nothing on empty days.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CalendarioView } from './CalendarioView';
import type { Evento } from '@lexscribe/shared-types';

// react-calendar accesses DOM APIs — mock only the CSS import
vi.mock('react-calendar/dist/Calendar.css', () => ({}));

function makeEvento(fechaInicio: string): Evento {
  return {
    _id: '507f1f77bcf86cd799439011',
    usuarioId: '507f1f77bcf86cd799439010',
    origen: 'manual',
    expedienteId: null,
    documentoId: null,
    subtipo: null,
    titulo: 'Test evento',
    descripcion: null,
    fechaInicio,
    fechaFin: null,
    color: '#3b82f6',
    mostrarEnCalendario: true,
    activo: true,
    fechaCreacion: fechaInicio,
    fechaActualizacion: fechaInicio,
  };
}

describe('CalendarioView', () => {
  const onDayClick = vi.fn();
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a dot (span) on a day that has an event', () => {
    const eventDate = new Date('2026-06-15T10:00:00.000Z');
    const eventos = [makeEvento(eventDate.toISOString())];

    const { container } = render(
      <CalendarioView
        eventos={eventos}
        value={eventDate}
        onChange={onChange}
        onDayClick={onDayClick}
      />,
    );

    // Should render the calendar
    const calendar = container.querySelector('.react-calendar');
    expect(calendar).toBeTruthy();

    // A dot span should be present for the event date tile
    const dots = container.querySelectorAll('span.block.w-1\\.5.h-1\\.5.rounded-full.bg-blue-500');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders no dots when there are no events', () => {
    const { container } = render(
      <CalendarioView
        eventos={[]}
        value={new Date('2026-06-01')}
        onChange={onChange}
        onDayClick={onDayClick}
      />,
    );

    const dots = container.querySelectorAll('span.block.w-1\\.5.h-1\\.5.rounded-full.bg-blue-500');
    expect(dots.length).toBe(0);
  });
});
