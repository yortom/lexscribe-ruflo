'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExpediente } from '@/lib/api/expedientes';
import { listPlantillas, getPlantilla } from '@/lib/api/plantillas';
import { getContacto } from '@/lib/api/contactos';
import { getEsquema } from '@/lib/api/esquemas';
import { GeneracionForm } from '@/components/documentos/GeneracionForm';
import type { Plantilla } from '@lexscribe/shared-types';

/**
 * Página D-05: seleccionar plantilla y lanzar formulario de generación.
 * Next.js 14 — params es síncrono.
 */
export default function NuevoDocumentoPage({ params }: { params: { id: string } }) {
  const { id: expedienteId } = params;
  const [plantillaId, setPlantillaId] = useState<string>('');
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [contactoFieldsByRol, setContactoFieldsByRol] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [loadingPlantilla, setLoadingPlantilla] = useState(false);

  const { data: expediente, isLoading: loadingExp } = useQuery({
    queryKey: ['expediente', expedienteId],
    queryFn: () => getExpediente(expedienteId),
  });

  const { data: plantillasData, isLoading: loadingPlantillas } = useQuery({
    queryKey: ['plantillas'],
    queryFn: () => listPlantillas(),
  });

  // Esquemas dinámicos para detectar campos nuevos (D-08 / DOC-03)
  const { data: esqExpediente } = useQuery({
    queryKey: ['esquema', 'expediente'],
    queryFn: () => getEsquema('expediente'),
  });
  const { data: esqContacto } = useQuery({
    queryKey: ['esquema', 'contacto'],
    queryFn: () => getEsquema('contacto'),
  });

  const esquemaCampos =
    esqExpediente && esqContacto
      ? {
          expediente: esqExpediente.parametros.map((p) => p.nombre),
          contacto: esqContacto.parametros.map((p) => p.nombre),
        }
      : undefined;

  async function handleSelectPlantilla(pid: string) {
    setPlantillaId(pid);
    setPlantilla(null);
    setContactoFieldsByRol({});
    if (!pid || !expediente) return;

    setLoadingPlantilla(true);
    try {
      const p = await getPlantilla(pid);
      setPlantilla(p);

      // Resolver contactoFieldsByRol: para cada vínculo del expediente, cargar datos del contacto
      const byRol: Record<string, Record<string, unknown>> = {};
      await Promise.all(
        (expediente.contactos ?? []).map(async (vinculo) => {
          try {
            const contactoDetail = await getContacto(vinculo.contactoId);
            byRol[vinculo.rol] = {
              nombre: contactoDetail.nombre,
              ...(contactoDetail.parametros ?? {}),
            };
          } catch {
            // Si falla, deja el rol sin datos pre-rellenados
            byRol[vinculo.rol] = {};
          }
        }),
      );
      setContactoFieldsByRol(byRol);
    } finally {
      setLoadingPlantilla(false);
    }
  }

  if (loadingExp || loadingPlantillas) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  if (!expediente) {
    return <p className="text-gray-500">Expediente no encontrado</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Nuevo documento</h1>
        <p className="text-sm text-gray-600">Expediente: {expediente.nombre}</p>
      </header>

      {/* Selector de plantilla */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Plantilla</label>
        <select
          value={plantillaId}
          onChange={(e) => handleSelectPlantilla(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecciona una plantilla</option>
          {(plantillasData?.items ?? []).map((p) => (
            <option key={p._id} value={p._id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {loadingPlantilla && <p className="text-sm text-gray-500">Cargando plantilla...</p>}

      {/* Formulario de generación */}
      {plantilla && !loadingPlantilla && (
        <GeneracionForm
          expedienteId={expedienteId}
          plantilla={plantilla}
          expediente={expediente}
          contactoFieldsByRol={contactoFieldsByRol}
          esquemaCampos={esquemaCampos}
        />
      )}
    </div>
  );
}
