'use client';
import type { Evento } from '@lexscribe/shared-types';

interface EventosListProps {
  eventos: Evento[];
}

/**
 * EventosList — list panel showing events for the selected day/range (CAL-03).
 * Displays titulo, fechaInicio, subtipo/origen badge, and color swatch per row.
 */
export function EventosList({ eventos }: EventosListProps) {
  if (eventos.length === 0) {
    return (
      <p className="text-sm text-gray-500">No hay eventos para el día seleccionado.</p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
      {eventos.map((evento) => (
        <li key={evento._id} className="flex items-center gap-3 px-4 py-3 text-sm">
          {evento.color && (
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: evento.color }}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">{evento.titulo}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {new Date(evento.fechaInicio).toLocaleDateString('es-ES')}
              </span>
              {evento.subtipo && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                  {evento.subtipo}
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                {evento.origen}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
