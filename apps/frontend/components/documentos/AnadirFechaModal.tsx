'use client';
import { useState } from 'react';
import { createEvento } from '@/lib/api/eventos';

interface AnadirFechaModalProps {
  documentoId: string;
  expedienteId: string;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * AnadirFechaModal — FL-8 (D-05/D-06) modal for adding a date to a document.
 * Creates an event with origen='documento' linked to the documentoId + expedienteId.
 * Fields: fechaInicio, descripcion, subtipo, mostrarEnCalendario (default true).
 * titulo falls back to subtipo if descripcion is empty.
 */
export function AnadirFechaModal({
  documentoId,
  expedienteId,
  onClose,
  onCreated,
}: AnadirFechaModalProps) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [subtipo, setSubtipo] = useState<'fecha_limite' | 'aviso' | 'recordatorio'>('fecha_limite');
  const [mostrarEnCalendario, setMostrarEnCalendario] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fechaInicio) return;
    setGuardando(true);
    setErrorMsg(null);

    try {
      await createEvento({
        origen: 'documento',
        documentoId,
        expedienteId,
        subtipo,
        titulo: descripcion.trim() || subtipo,
        descripcion: descripcion.trim() || undefined,
        fechaInicio: new Date(fechaInicio).toISOString(),
        mostrarEnCalendario,
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
          <h3 className="text-lg font-semibold">Añadir fecha</h3>
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
            <label htmlFor="anadir-fecha-inicio" className="block text-sm font-medium text-gray-700">
              Fecha *
            </label>
            <input
              id="anadir-fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="anadir-fecha-tipo" className="block text-sm font-medium text-gray-700">
              Tipo
            </label>
            <select
              id="anadir-fecha-tipo"
              value={subtipo}
              onChange={(e) => setSubtipo(e.target.value as typeof subtipo)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="fecha_limite">Fecha límite</option>
              <option value="aviso">Aviso</option>
              <option value="recordatorio">Recordatorio</option>
            </select>
          </div>

          <div>
            <label htmlFor="anadir-fecha-descripcion" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <input
              id="anadir-fecha-descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="anadir-fecha-visible"
              type="checkbox"
              checked={mostrarEnCalendario}
              onChange={(e) => setMostrarEnCalendario(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="anadir-fecha-visible" className="text-sm text-gray-700">
              Mostrar en calendario
            </label>
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
              disabled={!fechaInicio || guardando}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar fecha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
