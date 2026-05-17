'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { listContactos } from '@/lib/api/contactos';
import { ContactoTable } from '@/components/contactos/ContactoTable';

export default function ContactosPage() {
  const [search, setSearch] = useState('');
  const [tipologia, setTipologia] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['contactos', { search, tipologia, page, limit }],
    queryFn: () =>
      listContactos({
        search: search || undefined,
        tipologia: (tipologia as 'cliente' | 'parte_contraria' | 'interesado' | 'otros') ?? undefined,
        page,
        limit,
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Contactos</h2>
        <Link
          href="/contactos/nuevo"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Nuevo contacto
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && (
        <p className="text-red-600" role="alert">
          Error: {(error as Error).message}
        </p>
      )}
      {data && (
        <ContactoTable
          items={data.items}
          total={data.total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onSearch={(q) => {
            setSearch(q);
            setPage(1);
          }}
          onTipologiaChange={(t) => {
            setTipologia(t);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
