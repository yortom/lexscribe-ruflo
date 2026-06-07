'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEventos, updateEvento } from '@/lib/api/eventos';

interface FechasTabProps {
  expedienteId: string;
}

/**
 * FechasTab — shows ALL events for an expediente (incl. non-visible-in-calendar),
 * sorted by fechaInicio ascending (D-04, Open Q3 flat list).
 * Provides a visibility toggle (mostrarEnCalendario) per event row.
 */
export function FechasTab({ expedienteId }: FechasTabProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['eventos', 'expediente', expedienteId],
    queryFn: () => listEventos({ expedienteId, limit: 200 }),
    // No soloCalendario — shows ALL events including non-visible ones
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, mostrarEnCalendario }: { id: string; mostrarEnCalendario: boolean }) =>
      updateEvento(id, { mostrarEnCalendario }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos', 'expediente', expedienteId] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Cargando fechas...</p>;
  }

  const eventos = data?.items ?? [];

  if (eventos.length === 0) {
    return <p className="text-sm text-gray-500">No hay fechas registradas para este expediente.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Fechas y eventos</h3>
      <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
        {eventos.map((evento) => (
          <li
            key={evento._id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-medium text-gray-900">{evento.titulo}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>{new Date(evento.fechaInicio).toLocaleDateString('es-ES')}</span>
                {evento.subtipo && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                    {evento.subtipo}
                  </span>
                )}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  {evento.origen}
                </span>
                {evento.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: evento.color }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={evento.mostrarEnCalendario}
                  disabled={toggleMut.isPending}
                  onChange={() =>
                    toggleMut.mutate({
                      id: evento._id,
                      mostrarEnCalendario: !evento.mostrarEnCalendario,
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                En calendario
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
