'use client';
// CSS must be imported inside a 'use client' component to avoid SSR mismatch (Pitfall 2)
import 'react-calendar/dist/Calendar.css';
import Calendar from 'react-calendar';
import type { TileContentFunc } from 'react-calendar';
import type { Evento } from '@lexscribe/shared-types';

interface CalendarioViewProps {
  eventos: Evento[];
  value: Date;
  onChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

/**
 * CalendarioView — monthly grid powered by react-calendar (D-02, D-03, CAL-03).
 * Renders a dot on days that have events (mostrarEnCalendario=true).
 * Must be a 'use client' component — react-calendar manipulates DOM/browser state.
 */
export function CalendarioView({
  eventos,
  value,
  onChange,
  onDayClick,
}: CalendarioViewProps) {
  // Build a Set of ISO date strings for O(1) lookup (compare day only)
  const eventDates = new Set(
    eventos.map((e) => new Date(e.fechaInicio).toDateString()),
  );

  const tileContent: TileContentFunc = ({ date, view }) => {
    if (view !== 'month') return null;
    if (eventDates.has(date.toDateString())) {
      return (
        <span className="block w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />
      );
    }
    return null;
  };

  return (
    <Calendar
      onChange={(v) => onChange(v as Date)}
      value={value}
      onClickDay={onDayClick}
      tileContent={tileContent}
      locale="es-ES"
    />
  );
}
