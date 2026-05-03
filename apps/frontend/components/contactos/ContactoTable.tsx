'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Contacto } from '@lexscribe/shared-types';

interface ContactoTableProps {
  items: Contacto[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSearch: (q: string) => void;
  onTipologiaChange: (t: string | null) => void;
}

const TIPOLOGIAS = [
  { value: '', label: 'Todas' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'parte_contraria', label: 'Parte contraria' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'otros', label: 'Otros' },
];

export function ContactoTable({
  items,
  total,
  page,
  limit,
  onPageChange,
  onSearch,
  onTipologiaChange,
}: ContactoTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre o NIF..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          onChange={(e) => onTipologiaChange(e.target.value || null)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TIPOLOGIAS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Nombre
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Tipo
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Tipología
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Documentación fiscal
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-400"
                >
                  No hay contactos
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => router.push(`/contactos/${c._id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.tipo === 'fisica' ? 'Persona física' : 'Persona jurídica'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.tipologia}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.documentacionFiscal ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.email ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
