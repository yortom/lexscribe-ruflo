'use client';
/**
 * InsertarClausulaModal — Phase 4 clausula library filter + insert with renumber (CLAU-04, D-06).
 *
 * Props:
 *   contenido: current editor text
 *   afterNumero: the clause ordinal number immediately before the insertion point
 *                (0 = insert before all clauses). Caller derives this from
 *                detectClausulaHeaders() relative to the cursor position.
 *   onInsert(nuevoContenido): called with the full text after insertion+renumber
 *   onClose: called to dismiss the modal
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Clausula } from '@lexscribe/shared-types';
import { listClausulas } from '@/lib/api/clausulas';
import { insertClausulaAndRenumber } from '@lexscribe/shared-validation';
import { useDebounce } from '@/hooks/useDebounce';

interface InsertarClausulaModalProps {
  contenido: string;
  /** Clause number immediately before insertion point. 0 = top of document. */
  afterNumero: number;
  onInsert: (nuevoContenido: string) => void;
  onClose: () => void;
}

export function InsertarClausulaModal({
  contenido,
  afterNumero,
  onInsert,
  onClose,
}: InsertarClausulaModalProps) {
  const [labelInput, setLabelInput] = useState('');
  const label = useDebounce(labelInput, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['clausulas', { label }],
    queryFn: () => listClausulas({ label: label || undefined }),
  });

  function handleInsert(clausula: Clausula) {
    const nuevo = insertClausulaAndRenumber(contenido, clausula.texto, afterNumero);
    onInsert(nuevo);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insertar cláusula"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Insertar cláusula</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar por label..."
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {data?.items.map((clausula) => (
            <li
              key={clausula._id}
              className="flex items-center justify-between rounded-md border border-gray-100 p-3 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{clausula.nombre}</p>
                {clausula.labels.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {clausula.labels.slice(0, 4).map((lbl) => (
                      <span
                        key={lbl}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleInsert(clausula)}
                className="ml-3 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                Insertar
              </button>
            </li>
          ))}
          {data?.items.length === 0 && !isLoading && (
            <li className="py-4 text-center text-sm text-gray-400">
              No hay cláusulas para este filtro
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
