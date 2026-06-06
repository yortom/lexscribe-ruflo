'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listEventos } from '@/lib/api/eventos';
import { EventosList } from '@/components/calendario/EventosList';
import { EventoModal } from '@/components/calendario/EventoModal';
import type { Evento } from '@lexscribe/shared-types';

// Dynamic import to prevent SSR CSS issues (react-calendar CSS, Pitfall 2)
const CalendarioView = dynamic(
  () => import('@/components/calendario/CalendarioView').then((m) => m.CalendarioView),
  { ssr: false },
);

/**
 * Global /calendario page (D-03, CAL-03).
 * Shows only mostrarEnCalendario=true events (soloCalendario filter).
 * Supports filtering by expedienteId and date range.
 */
export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [expedienteIdFilter, setExpedienteIdFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showEventoModal, setShowEventoModal] = useState(false);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['eventos', 'calendario', { expedienteIdFilter, fechaDesde, fechaHasta }],
    queryFn: () =>
      listEventos({
        soloCalendario: true,
        expedienteId: expedienteIdFilter || undefined,
        fechaDesde: fechaDesde ? new Date(fechaDesde).toISOString() : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta).toISOString() : undefined,
        limit: 200,
      }),
  });

  const eventos: Evento[] = data?.items ?? [];

  // Filter events for the selected day
  const eventsForSelectedDay = eventos.filter(
    (e) =>
      new Date(e.fechaInicio).toDateString() === selectedDate.toDateString(),
  );

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['eventos', 'calendario'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendario</h1>
        <button
          type="button"
          onClick={() => setShowEventoModal(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo evento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-md border border-gray-200 p-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Expediente ID</label>
          <input
            type="text"
            value={expedienteIdFilter}
            onChange={(e) => setExpedienteIdFilter(e.target.value)}
            placeholder="ID del expediente..."
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {(expedienteIdFilter || fechaDesde || fechaHasta) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setExpedienteIdFilter('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Calendar + Event List */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <div>
          {isLoading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <CalendarioView
              eventos={eventos}
              value={selectedDate}
              onChange={setSelectedDate}
              onDayClick={setSelectedDate}
            />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">
            Eventos del {selectedDate.toLocaleDateString('es-ES')}
          </h2>
          <EventosList eventos={eventsForSelectedDay} />
        </div>
      </div>

      {showEventoModal && (
        <EventoModal
          onClose={() => setShowEventoModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
