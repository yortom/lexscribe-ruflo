'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ContactoForm } from '@/components/contactos/ContactoForm';
import { getContacto, updateContacto, deleteContacto } from '@/lib/api/contactos';
import type { CreateContactoInput } from '@lexscribe/shared-validation';

// Next.js 14: params is synchronous (not a Promise)
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
      <header className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{data.nombre}</h2>
        <button
          onClick={() => {
            if (confirm('¿Eliminar contacto?')) deleteMut.mutate();
          }}
          disabled={deleteMut.isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Eliminar
        </button>
      </header>

      {updateMut.isSuccess && (
        <p className="text-green-600 text-sm" role="status">
          Cambios guardados
        </p>
      )}
      {updateMut.error && (
        <p className="text-red-600 text-sm" role="alert">
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

      {/* CONT-05: Expedientes vinculados — stub vacío hasta Phase 4 */}
      <section className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">Expedientes vinculados</h3>
        {data.expedientesVinculados.length === 0 ? (
          <p className="text-sm text-gray-500">
            Este contacto no aparece en ningún expediente todavía.
            (Disponible cuando se implementen expedientes en Phase 4.)
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.expedientesVinculados.map((e) => (
              <li key={e._id} className="text-gray-700">
                {e.nombre} — {e.rol}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
