'use client';
import type { Clausula } from '@lexscribe/shared-types';

interface ClausulaTableProps {
  items: Clausula[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES');
}

export function ClausulaTable({
  items,
  total,
  page,
  limit,
  onPageChange,
  onEdit,
  onDelete,
}: ClausulaTableProps) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Labels</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Creada</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No hay clausulas
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.labels.slice(0, 3).map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {label}
                        </span>
                      ))}
                      {c.labels.length > 3 && (
                        <span className="text-xs text-gray-400">...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatFecha(c.fechaCreacion)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => onEdit(c._id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Eliminar clausula?')) onDelete(c._id);
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Pagina {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
