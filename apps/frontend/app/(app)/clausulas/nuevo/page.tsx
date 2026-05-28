'use client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ClausulaForm } from '@/components/clausulas/ClausulaForm';
import { createClausula } from '@/lib/api/clausulas';
import type { CreateClausulaInput } from '@lexscribe/shared-validation';

export default function NuevaClausulaPage() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateClausulaInput) => createClausula(data),
    onSuccess: () => router.push('/clausulas'),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nueva clausula</h2>
      {mutation.error && (
        <p className="text-red-600" role="alert">
          Error: {(mutation.error as Error).message}
        </p>
      )}
      <ClausulaForm
        isPending={mutation.isPending}
        onSubmit={async (data) => {
          try {
            await mutation.mutateAsync(data);
          } catch {
            // TanStack Query stores the error in mutation.error for inline UI.
          }
        }}
        submitLabel="Crear clausula"
      />
    </div>
  );
}
