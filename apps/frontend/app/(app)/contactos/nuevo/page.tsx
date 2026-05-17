'use client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ContactoForm } from '@/components/contactos/ContactoForm';
import { createContacto } from '@/lib/api/contactos';
import type { CreateContactoInput } from '@lexscribe/shared-validation';

export default function NuevoContactoPage() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateContactoInput) => createContacto(data),
    onSuccess: (contacto) => router.push(`/contactos/${contacto._id}`),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nuevo contacto</h2>
      {mutation.error && (
        <p className="text-red-600" role="alert">
          Error: {(mutation.error as Error).message}
        </p>
      )}
      <ContactoForm
        onSubmit={async (data) => {
          try {
            await mutation.mutateAsync(data);
          } catch {
            // TanStack Query stores the error in mutation.error for inline UI.
          }
        }}
        submitLabel="Crear contacto"
      />
    </div>
  );
}
