'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContactoVinculado } from '@lexscribe/shared-types';
import { unlinkContacto } from '@/lib/api/expedientes';
import { AsociarContactoModal } from './AsociarContactoModal';

interface ContactosVinculadosTabProps {
  expedienteId: string;
  contactos: ContactoVinculado[];
}

export function ContactosVinculadosTab({
  expedienteId,
  contactos,
}: ContactosVinculadosTabProps) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const unlinkMut = useMutation({
    mutationFn: ({ contactoId, rol }: { contactoId: string; rol: string }) =>
      unlinkContacto(expedienteId, contactoId, rol),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['expediente', expedienteId] });
      qc.invalidateQueries({ queryKey: ['contacto', vars.contactoId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Contactos vinculados</h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Asociar contacto
        </button>
      </div>

      {unlinkMut.error && (
        <p className="text-sm text-red-600" role="alert">
          Error: {(unlinkMut.error as Error).message}
        </p>
      )}

      {contactos.length === 0 ? (
        <p className="text-sm text-gray-500">Sin contactos vinculados</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {contactos.map((c) => (
            <li
              key={`${c.contactoId}-${c.rol}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <Link
                  href={`/contactos/${c.contactoId}`}
                  className="text-blue-600 hover:underline"
                >
                  {c.contactoId}
                </Link>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {c.rol}
                </span>
              </div>
              <button
                type="button"
                disabled={unlinkMut.isPending}
                onClick={() => unlinkMut.mutate({ contactoId: c.contactoId, rol: c.rol })}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Desasociar
              </button>
            </li>
          ))}
        </ul>
      )}

      <AsociarContactoModal
        expedienteId={expedienteId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
