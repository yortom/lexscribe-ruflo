'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listPlantillas, deletePlantilla } from '@/lib/api/plantillas';
import { PlantillaTable } from '@/components/plantillas/PlantillaTable';
import { useDebounce } from '@/hooks/useDebounce';

export default function PlantillasPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const search = useDebounce(searchInput, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['plantillas', { search, page, limit }],
    queryFn: () =>
      listPlantillas({
        search: search || undefined,
        page,
        limit,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlantilla(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantillas'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Plantillas</h2>
        <Link
          href="/plantillas/nuevo"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nueva plantilla
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
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

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
        <PlantillaTable
          items={data.items}
          total={data.total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onEdit={(id) => router.push(`/plantillas/${id}`)}
          onDelete={(id) => deleteMut.mutate(id)}
        />
      )}
    </div>
  );
}
