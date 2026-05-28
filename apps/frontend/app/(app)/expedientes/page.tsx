'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { listExpedientes } from '@/lib/api/expedientes';
import { ExpedienteTable } from '@/components/expedientes/ExpedienteTable';
import { useDebounce } from '@/hooks/useDebounce';

export default function ExpedientesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const search = useDebounce(searchInput, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['expedientes', { search, page, limit }],
    queryFn: () => listExpedientes({ search: search || undefined, page, limit }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Expedientes</h2>
        <Link
          href="/expedientes/nuevo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nuevo expediente
        </Link>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          setPage(1);
        }}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Error: {(error as Error).message}
        </p>
      )}
      {data && (
        <ExpedienteTable
          items={data.items}
          total={data.total}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
