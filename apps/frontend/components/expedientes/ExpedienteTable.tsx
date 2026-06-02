'use client';
import { useRouter } from 'next/navigation';
import type { Expediente } from '@lexscribe/shared-types';

interface ExpedienteTableProps {
  items: Expediente[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES');
}

export function ExpedienteTable({
  items,
  total,
  page,
  limit,
  onPageChange,
}: ExpedienteTableProps) {
  const router = useRouter();
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Contactos</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No hay expedientes
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr
                  key={e._id}
                  onClick={() => router.push(`/expedientes/${e._id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{e.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{e.contactos.length}</td>
                  <td className="px-4 py-3 text-gray-600">{formatFecha(e.fechaCreacion)}</td>
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
