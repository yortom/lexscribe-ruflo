'use client';
import Link from 'next/link';

interface ExpedienteVinculado {
  _id: string;
  nombre: string;
  rol: string;
}

interface ExpedientesVinculadosSectionProps {
  expedientes: ExpedienteVinculado[];
}

export function ExpedientesVinculadosSection({
  expedientes,
}: ExpedientesVinculadosSectionProps) {
  const expedientesVinculados = expedientes;

  return (
    <section className="border-t pt-4">
      <h3 className="mb-2 text-lg font-semibold">Expedientes vinculados</h3>
      {expedientesVinculados.length === 0 ? (
        <p className="text-sm text-gray-500">Sin expedientes vinculados</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {expedientesVinculados.map((e) => (
            <li key={`${e._id}-${e.rol}`} className="flex items-center gap-2">
              <Link href={`/expedientes/${e._id}`} className="text-blue-600 hover:underline">
                {e.nombre}
              </Link>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {e.rol}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
