'use client';
import { useState } from 'react';
import type { ExpedienteDetailResponse } from '@lexscribe/shared-types';
import { ContactosVinculadosTab } from './ContactosVinculadosTab';
import { ParametrosTab } from './ParametrosTab';
import { DocumentosList } from '../documentos/DocumentosList';

type TabKey = 'contactos' | 'parametros' | 'documentos' | 'fechas' | 'facturacion';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'contactos', label: 'Contactos' },
  { key: 'parametros', label: 'Parametros' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'fechas', label: 'Fechas' },
  { key: 'facturacion', label: 'Facturacion' },
];

interface ExpedienteTabsProps {
  expediente: ExpedienteDetailResponse;
}

export function ExpedienteTabs({ expediente }: ExpedienteTabsProps) {
  const [active, setActive] = useState<TabKey>('contactos');

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              active === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>
        {active === 'contactos' && (
          <ContactosVinculadosTab
            expedienteId={expediente._id}
            contactos={expediente.contactos}
          />
        )}
        {active === 'parametros' && <ParametrosTab parametros={expediente.parametros} />}
        {active === 'documentos' && (
          <DocumentosList expedienteId={expediente._id} />
        )}
        {active === 'fechas' && <p className="text-sm text-gray-500">Disponible en Phase 7</p>}
        {active === 'facturacion' && (
          <p className="text-sm text-gray-500">Disponible en Phase 7</p>
        )}
      </div>
    </div>
  );
}
