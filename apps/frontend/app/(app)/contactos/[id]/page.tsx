'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ContactoForm } from '@/components/contactos/ContactoForm';
import { ExpedientesVinculadosSection } from '@/components/contactos/ExpedientesVinculadosSection';
import { deleteContacto, getContacto, updateContacto } from '@/lib/api/contactos';
import type { CreateContactoInput } from '@lexscribe/shared-validation';

export default function ContactoDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contacto', id],
    queryFn: () => getContacto(id),
  });

  const updateMut = useMutation({
    mutationFn: (input: CreateContactoInput) => updateContacto(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacto', id] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteContacto(id),
    onSuccess: () => router.push('/contactos'),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (!data) return <p className="text-gray-500">No encontrado</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{data.nombre}</h2>
        <button
          onClick={() => {
            if (confirm('Eliminar contacto?')) deleteMut.mutate();
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

      <ContactoForm
        initial={data}
        onSubmit={async (input) => {
          try {
            await updateMut.mutateAsync(input);
          } catch {
            // TanStack Query stores the error in updateMut.error for inline UI.
          }
        }}
        submitLabel="Guardar cambios"
      />

      <ExpedientesVinculadosSection expedientes={data?.expedientesVinculados ?? []} />
    </div>
  );
}
