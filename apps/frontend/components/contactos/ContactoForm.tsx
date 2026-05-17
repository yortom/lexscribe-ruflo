'use client';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateContactoSchema, type CreateContactoInput } from '@lexscribe/shared-validation';
import { ParametrosEditor } from './ParametrosEditor';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : (v as string));

interface ContactoFormProps {
  initial?: Partial<CreateContactoInput>;
  onSubmit: (data: CreateContactoInput) => Promise<void> | void;
  submitLabel?: string;
}

function getDefaultValues(initial?: Partial<CreateContactoInput>): CreateContactoInput {
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

export function ContactoForm({ initial, onSubmit, submitLabel = 'Guardar' }: ContactoFormProps) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo</label>
          <select
            {...register('tipo')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="fisica">Persona fisica</option>
            <option value="juridica">Persona juridica</option>
          </select>
          {errors.tipo && <span className="text-sm text-red-600">{errors.tipo.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipologia</label>
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
            <span className="text-sm text-red-600">{errors.tipologia.message}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre / Razon social</label>
        <input
          {...register('nombre')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.nombre && <span className="text-sm text-red-600">{errors.nombre.message}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">NIF/CIF</label>
          <input
            {...register('documentacionFiscal', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.documentacionFiscal && (
            <span className="text-sm text-red-600">{errors.documentacionFiscal.message}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">DNI/NIE</label>
          <input
            {...register('documentoIdentidad', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.documentoIdentidad && (
            <span className="text-sm text-red-600">{errors.documentoIdentidad.message}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.email && <span className="text-sm text-red-600">{errors.email.message}</span>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefono</label>
          <input
            {...register('telefono', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.telefono && (
            <span className="text-sm text-red-600">{errors.telefono.message}</span>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Direccion</label>
          <input
            {...register('direccion', { setValueAs: emptyToUndefined })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.direccion && (
            <span className="text-sm text-red-600">{errors.direccion.message}</span>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-gray-700">Parametros personalizados</h3>
        <ParametrosEditor
          value={parametros}
          onChange={(next) => setValue('parametros', next, { shouldValidate: false })}
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
