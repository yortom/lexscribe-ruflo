'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listClausulas, deleteClausula } from '@/lib/api/clausulas';
import { ClausulaTable } from '@/components/clausulas/ClausulaTable';
import { useDebounce } from '@/hooks/useDebounce';

export default function ClausulasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const search = useDebounce(searchInput, 300);
  const label = useDebounce(labelInput, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['clausulas', { search, label, page, limit }],
    queryFn: () =>
      listClausulas({
        search: search || undefined,
        label: label || undefined,
        page,
        limit,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteClausula(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clausulas'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Clausulas</h2>
        <Link
          href="/clausulas/nuevo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva clausula
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Buscar por nombre o texto..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filtrar por label..."
          value={labelInput}
          onChange={(e) => {
            setLabelInput(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Error: {(error as Error).message}
        </p>
      )}
      {deleteMut.error && (
        <p className="text-red-600" role="alert">
          Error al borrar: {(deleteMut.error as Error).message}
        </p>
      )}
      {data && (
        <ClausulaTable
          items={data.items}
          total={data.total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onEdit={(id) => router.push(`/clausulas/${id}`)}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      )}
    </div>
  );
}
