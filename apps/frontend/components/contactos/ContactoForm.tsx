'use client';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateContactoSchema,
  type CreateContactoInput,
} from '@lexscribe/shared-validation';
import { ParametrosEditor } from './ParametrosEditor';

/**
 * RHF helper: coerce empty string to undefined for optional string fields.
 * This ensures Zod's .string().email().optional() accepts empty <input> as "not provided".
 * i18n note: Zod validation messages are in English for MVP — translation to Spanish is deferred (i18n pending).
 */
const emptyToUndefined = (v: unknown) =>
  v === '' ? undefined : (v as string);

interface ContactoFormProps {
  initial?: Partial<CreateContactoInput>;
  onSubmit: (data: CreateContactoInput) => Promise<void> | void;
  submitLabel?: string;
}

function getDefaultValues(
  initial?: Partial<CreateContactoInput>,
): CreateContactoInput {
  return {
    tipo: initial?.tipo ?? 'fisica',
    tipologia: initial?.tipologia ?? 'cliente',
    nombre: initial?.nombre ?? '',
    documentacionFiscal: initial?.documentacionFiscal,
    documentoIdentidad: initial?.documentoIdentidad,
    direccion: initial?.direccion,
    email: initial?.email,
    telefono: initial?.telefono,
    parametros: initial?.parametros ?? {},
  };
}

export function ContactoForm({
  initial,
  onSubmit,
  submitLabel = 'Guardar',
}: ContactoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateContactoInput>({
    resolver: zodResolver(CreateContactoSchema) as Resolver<CreateContactoInput>,
    defaultValues: getDefaultValues(initial),
  });

  const parametros = (watch('parametros') as Record<string, unknown>) ?? {};

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo
          </label>
          <select
            {...register('tipo')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="fisica">Persona física</option>
            <option value="juridica">Persona jurídica</option>
          </select>
          {errors.tipo && (
            <span className="text-red-600 text-sm">{errors.tipo.message}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipología
          </label>
          <select
            {...register('tipologia')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="cliente">Cliente</option>
            <option value="parte_contraria">Parte contraria</option>
            <option value="interesado">Interesado</option>
            <option value="otros">Otros</option>
          </select>
          {errors.tipologia && (
            <span className="text-red-600 text-sm">
              {errors.tipologia.message}
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Nombre / Razón social
        </label>
        <input
          {...register('nombre')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.nombre && (
          <span className="text-red-600 text-sm">{errors.nombre.message}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            NIF/CIF
          </label>
          <input
            {...register('documentacionFiscal', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.documentacionFiscal && (
            <span className="text-red-600 text-sm">
              {errors.documentacionFiscal.message}
            </span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            DNI/NIE
          </label>
          <input
            {...register('documentoIdentidad', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.documentoIdentidad && (
            <span className="text-red-600 text-sm">
              {errors.documentoIdentidad.message}
            </span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            {...register('email', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.email && (
            <span className="text-red-600 text-sm">{errors.email.message}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            {...register('telefono', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.telefono && (
            <span className="text-red-600 text-sm">
              {errors.telefono.message}
            </span>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Dirección
          </label>
          <input
            {...register('direccion', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.direccion && (
            <span className="text-red-600 text-sm">
              {errors.direccion.message}
            </span>
          )}
        </div>
      </div>

      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Parámetros personalizados
        </h3>
        <ParametrosEditor
          value={parametros}
          onChange={(next) =>
            setValue('parametros', next, { shouldValidate: false })
          }
        />
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Guardando...' : submitLabel}
      </button>
    </form>
  );
}
