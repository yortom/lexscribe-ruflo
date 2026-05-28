'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listContactos } from '@/lib/api/contactos';
import { linkContacto, ApiError } from '@/lib/api/expedientes';
import { useDebounce } from '@/hooks/useDebounce';

interface AsociarContactoModalProps {
  expedienteId: string;
  open: boolean;
  onClose: () => void;
}

export function AsociarContactoModal({
  expedienteId,
  open,
  onClose,
}: AsociarContactoModalProps) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [contactoId, setContactoId] = useState('');
  const [rol, setRol] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const search = useDebounce(searchInput, 300);

  const { data: contactosData } = useQuery({
    queryKey: ['contactos', { search }],
    queryFn: () => listContactos({ search: search || undefined, limit: 20 }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => linkContacto(expedienteId, { contactoId, rol }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expediente', expedienteId] });
      qc.invalidateQueries({ queryKey: ['contacto', contactoId] });
      setContactoId('');
      setRol('');
      setErrorMsg(null);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg(`Este contacto ya esta vinculado con el rol "${rol}"`);
      } else {
        setErrorMsg((err as Error).message);
      }
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-md bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Asociar contacto</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700">Buscar contacto</label>
          <input
            type="text"
            value={searchInput}
            placeholder="Buscar por nombre..."
            onChange={(e) => setSearchInput(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={contactoId}
            onChange={(e) => setContactoId(e.target.value)}
            className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecciona un contacto</option>
            {(contactosData?.items ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Rol</label>
          <input
            type="text"
            value={rol}
            placeholder="cliente, vendedor..."
            onChange={(e) => setRol(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!contactoId || !rol.trim() || mutation.isPending}
            onClick={() => {
              setErrorMsg(null);
              mutation.mutate();
            }}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
