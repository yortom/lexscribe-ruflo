'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExpedienteTabs } from '@/components/expedientes/ExpedienteTabs';
import { getExpediente, updateExpediente, deleteExpediente } from '@/lib/api/expedientes';

export default function ExpedienteDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => getExpediente(id),
  });

  useEffect(() => {
    if (data?.nombre) setNombre(data.nombre);
  }, [data?.nombre]);

  const updateMut = useMutation({
    mutationFn: () => updateExpediente(id, { nombre }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expediente', id] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteExpediente(id),
    onSuccess: () => router.push('/expedientes'),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (!data) return <p className="text-gray-500">No encontrado</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xl font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => updateMut.mutate()}
          disabled={updateMut.isPending || nombre.trim() === ''}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Eliminar expediente?')) deleteMut.mutate();
          }}
          disabled={deleteMut.isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Eliminar
        </button>
      </header>

      {updateMut.isSuccess && (
        <p className="text-sm text-green-600" role="status">
          Cambios guardados
        </p>
      )}
      {updateMut.error && (
        <p className="text-sm text-red-600" role="alert">
          Error: {(updateMut.error as Error).message}
        </p>
      )}

      <ExpedienteTabs expediente={data} />
    </div>
  );
}
