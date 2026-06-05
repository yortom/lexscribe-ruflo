'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listContactos, createContacto } from '@/lib/api/contactos';
import { useDebounce } from '@/hooks/useDebounce';

interface RolFaltanteModalProps {
  rol: string;
  onAsignar: (contactoId: string) => void;
  onClose: () => void;
}

type TabModalKey = 'buscar' | 'crear';

/**
 * Modal D-06: asignar contacto a un rol requerido que no tiene vínculo.
 * Dos secciones: buscar contacto existente | crear contacto básico.
 */
export function RolFaltanteModal({ rol, onAsignar, onClose }: RolFaltanteModalProps) {
  const [tab, setTab] = useState<TabModalKey>('buscar');

  // --- Buscar contacto existente ---
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const search = useDebounce(searchInput, 300);

  const { data: contactosData } = useQuery({
    queryKey: ['contactos', { search }],
    queryFn: () => listContactos({ search: search || undefined, limit: 20 }),
  });

  // --- Crear contacto básico ---
  const [nombre, setNombre] = useState('');
  const [documentacionFiscal, setDocumentacionFiscal] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCrear() {
    if (!nombre.trim()) return;
    setCreando(true);
    setErrorMsg(null);
    try {
      const nuevo = await createContacto({
        tipo: 'fisica',
        tipologia: 'cliente',
        nombre: nombre.trim(),
        documentacionFiscal: documentacionFiscal.trim() || undefined,
      } as Parameters<typeof createContacto>[0]);
      onAsignar(nuevo._id);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md space-y-4 rounded-md bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Asignar contacto para rol &ldquo;{rol}&rdquo;</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cerrar
          </button>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gray-200">
          {(['buscar', 'crear'] as TabModalKey[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'buscar' ? 'Buscar existente' : 'Crear contacto'}
            </button>
          ))}
        </nav>

        {tab === 'buscar' && (
          <div className="space-y-3">
            <input
              type="text"
              value={searchInput}
              placeholder="Buscar por nombre..."
              onChange={(e) => setSearchInput(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecciona un contacto</option>
              {(contactosData?.items ?? []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!selectedId}
                onClick={() => onAsignar(selectedId)}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
        )}

        {tab === 'crear' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">NIF / CIF</label>
              <input
                type="text"
                value={documentacionFiscal}
                onChange={(e) => setDocumentacionFiscal(e.target.value)}
                placeholder="12345678A"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!nombre.trim() || creando}
                onClick={handleCrear}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creando ? 'Creando...' : 'Crear y asignar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
