'use client';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateExpedienteSchema,
  type CreateExpedienteInput,
} from '@lexscribe/shared-validation';
import { ParametrosEditor } from '../contactos/ParametrosEditor';

interface ExpedienteFormProps {
  initial?: Partial<CreateExpedienteInput>;
  onSubmit: (data: CreateExpedienteInput) => Promise<void> | void;
  isPending?: boolean;
  submitLabel?: string;
}

function getDefaultValues(initial?: Partial<CreateExpedienteInput>): CreateExpedienteInput {
  return {
    nombre: initial?.nombre ?? '',
    parametros: initial?.parametros ?? {},
  };
}

export function ExpedienteForm({
  initial,
  onSubmit,
  isPending = false,
  submitLabel = 'Guardar',
}: ExpedienteFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpedienteInput>({
    resolver: zodResolver(CreateExpedienteSchema) as Resolver<CreateExpedienteInput>,
    defaultValues: getDefaultValues(initial),
  });

  const parametros = (watch('parametros') as Record<string, unknown>) ?? {};
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

      <section>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Parametros del expediente</h3>
        <ParametrosEditor
          value={parametros}
          onChange={(next) => setValue('parametros', next, { shouldValidate: false })}
        />
      </section>

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
