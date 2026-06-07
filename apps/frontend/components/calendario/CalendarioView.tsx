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
  // All-day events are stored as UTC midnight (e.g. 2026-06-07T00:00:00.000Z).
  // Compare by calendar-day key to avoid an off-by-one shift in timezones west
  // of UTC: take the event's UTC date portion, and each tile's LOCAL date
  // portion (react-calendar tile dates are local). Both yield the picked day
  // (YYYY-MM-DD) consistently across timezones.
  const eventDayKeys = new Set(
    eventos.map((e) => new Date(e.fechaInicio).toISOString().slice(0, 10)),
  );

  const localDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;

  const tileContent: TileContentFunc = ({ date, view }) => {
    if (view !== 'month') return null;
    if (eventDayKeys.has(localDayKey(date))) {
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
