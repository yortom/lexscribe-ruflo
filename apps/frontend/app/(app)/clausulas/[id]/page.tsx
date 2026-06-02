'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ClausulaForm } from '@/components/clausulas/ClausulaForm';
import { getClausula, updateClausula } from '@/lib/api/clausulas';
import type { CreateClausulaInput } from '@lexscribe/shared-validation';

export default function ClausulaDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['clausula', id],
    queryFn: () => getClausula(id),
  });

  const updateMut = useMutation({
    mutationFn: (input: CreateClausulaInput) => updateClausula(id, input),
    onSuccess: () => router.push('/clausulas'),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (!data) return <p className="text-gray-500">No encontrada</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Editar clausula</h2>
      {updateMut.error && (
        <p className="text-sm text-red-600" role="alert">
          Error: {(updateMut.error as Error).message}
        </p>
      )}
      <ClausulaForm
        initial={data}
        isPending={updateMut.isPending}
        onSubmit={async (input) => {
          try {
            await updateMut.mutateAsync(input);
          } catch {
            // TanStack Query stores the error in updateMut.error for inline UI.
          }
        }}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
