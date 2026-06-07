'use client';
import { useState } from 'react';
import { createEvento } from '@/lib/api/eventos';

/** Preset color palette (D-09, Open Q2 — 8 Tailwind 500 spectrum colors). */
const COLOR_PALETTE = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6b7280', // gray-500
];

interface EventoModalProps {
  onClose: () => void;
  onCreated: () => void;
  expedienteId?: string;
}

/**
 * EventoModal — create a manual event (CAL-02, D-08).
 * Fields: titulo, fechaInicio, fechaFin (optional), descripcion, subtipo, color,
 * expedienteId (optional). Calls createEvento with origen='manual'.
 */
export function EventoModal({ onClose, onCreated, expedienteId }: EventoModalProps) {
  const [titulo, setTitulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [subtipo, setSubtipo] = useState<'fecha_limite' | 'aviso' | 'recordatorio' | ''>('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fechaInicio) return;
    setGuardando(true);
    setErrorMsg(null);

    try {
      await createEvento({
        origen: 'manual',
        titulo: titulo.trim(),
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: fechaFin ? new Date(fechaFin).toISOString() : undefined,
        descripcion: descripcion.trim() || undefined,
        subtipo: subtipo || undefined,
        color,
        mostrarEnCalendario: true,
        expedienteId: expedienteId ?? undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-md bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nuevo evento</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="evento-titulo" className="block text-sm font-medium text-gray-700">
              Título *
            </label>
            <input
              id="evento-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="evento-fecha-inicio" className="block text-sm font-medium text-gray-700">
              Fecha inicio *
            </label>
            <input
              id="evento-fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="evento-fecha-fin" className="block text-sm font-medium text-gray-700">
              Fecha fin (opcional)
            </label>
            <input
              id="evento-fecha-fin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="evento-descripcion" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <input
              id="evento-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="evento-subtipo" className="block text-sm font-medium text-gray-700">
              Tipo
            </label>
            <select
              id="evento-subtipo"
              value={subtipo}
              onChange={(e) => setSubtipo(e.target.value as typeof subtipo)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Sin tipo</option>
              <option value="fecha_limite">Fecha límite</option>
              <option value="aviso">Aviso</option>
              <option value="recordatorio">Recordatorio</option>
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700">Color</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-gray-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!titulo.trim() || !fechaInicio || guardando}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Creando...' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
