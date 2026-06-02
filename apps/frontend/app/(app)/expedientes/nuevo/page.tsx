'use client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ExpedienteForm } from '@/components/expedientes/ExpedienteForm';
import { createExpediente } from '@/lib/api/expedientes';
import type { CreateExpedienteInput } from '@lexscribe/shared-validation';

export default function NuevoExpedientePage() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateExpedienteInput) => createExpediente(data),
    onSuccess: (expediente) => router.push(`/expedientes/${expediente._id}`),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nuevo expediente</h2>
      {mutation.error && (
        <p className="text-red-600" role="alert">
          Error: {(mutation.error as Error).message}
        </p>
      )}
      <ExpedienteForm
        isPending={mutation.isPending}
        onSubmit={async (data) => {
          try {
            await mutation.mutateAsync(data);
          } catch {
            // TanStack Query stores the error in mutation.error for inline UI.
          }
        }}
        submitLabel="Crear expediente"
      />
    </div>
  );
}
