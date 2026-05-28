'use client';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateClausulaSchema, type CreateClausulaInput } from '@lexscribe/shared-validation';
import { LabelsInput } from './LabelsInput';

interface ClausulaFormProps {
  initial?: Partial<CreateClausulaInput>;
  onSubmit: (data: CreateClausulaInput) => Promise<void> | void;
  isPending?: boolean;
  submitLabel?: string;
}

function getDefaultValues(initial?: Partial<CreateClausulaInput>): CreateClausulaInput {
  return {
    nombre: initial?.nombre ?? '',
    texto: initial?.texto ?? '',
    labels: initial?.labels ?? [],
  };
}

export function ClausulaForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = 'Guardar',
}: ClausulaFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateClausulaInput>({
    resolver: zodResolver(CreateClausulaSchema) as Resolver<CreateClausulaInput>,
    defaultValues: getDefaultValues(initial),
  });

  const labels = (watch('labels') as string[]) ?? [];
  const disabled = isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre</label>
        <input
          {...register('nombre')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.nombre && <span className="text-sm text-red-600">{errors.nombre.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Texto</label>
        <textarea
          {...register('texto')}
          rows={10}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.texto && <span className="text-sm text-red-600">{errors.texto.message}</span>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Labels</label>
        <LabelsInput
          value={labels}
          onChange={(next) => setValue('labels', next, { shouldValidate: false })}
        />
        {errors.labels && (
          <span className="text-sm text-red-600">{errors.labels.message as string}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {disabled ? 'Guardando...' : submitLabel}
      </button>
    </form>
  );
}
