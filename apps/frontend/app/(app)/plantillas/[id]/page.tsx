'use client';
/**
 * Plantilla editor page — view/edit an existing plantilla version (PLAN-05, PLAN-06).
 * SYNC params: Next.js 14 params are synchronous. Do NOT use use(params).
 *
 * Features:
 * - PlantillaEditor with live highlight + VariablesPanel
 * - "Insertar cláusula" button -> InsertarClausulaModal (CLAU-04)
 * - "Declarar variables" button -> DeclararVariableModal (PLAN-04)
 * - "Guardar" -> PATCH -> new version (PLAN-06); blocked on !valido variables (F-030b)
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PlantillaEditor, PlantillaEditorHandle } from '@/components/plantillas/PlantillaEditor';
import { VariablesPanel } from '@/components/plantillas/VariablesPanel';
import { InsertarClausulaModal } from '@/components/plantillas/InsertarClausulaModal';
import { DeclararVariableModal } from '@/components/plantillas/DeclararVariableModal';
import { getPlantilla, updatePlantilla, ApiError } from '@/lib/api/plantillas';
import { getEsquema, type Esquema } from '@/lib/api/esquemas';
import type { Plantilla } from '@lexscribe/shared-types';
import { parseVariables, detectClausulaHeaders } from '@lexscribe/shared-validation';
import type { VariableDetectada } from '@lexscribe/shared-validation';

export default function PlantillaDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const editorRef = useRef<PlantillaEditorHandle>(null);

  const [contenido, setContenido] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showInsertarModal, setShowInsertarModal] = useState(false);
  const [showDeclararModal, setShowDeclararModal] = useState(false);

  const { data, isLoading } = useQuery<Plantilla>({
    queryKey: ['plantilla', id],
    queryFn: () => getPlantilla(id),
  });

  // Already-declared dynamic fields per tipoObjeto (PLAN-04): used to hide variables
  // that are already in the esquema from the "Declarar variables" modal.
  const { data: esqExpediente } = useQuery<Esquema>({
    queryKey: ['esquema', 'expediente'],
    queryFn: () => getEsquema('expediente'),
  });
  const { data: esqContacto } = useQuery<Esquema>({
    queryKey: ['esquema', 'contacto'],
    queryFn: () => getEsquema('contacto'),
  });

  // Initialize local contenido from fetched data on first load
  useEffect(() => {
    if (data && !initialized) {
      setContenido(data.contenido);
      setInitialized(true);
    }
  }, [data, initialized]);

  const editorValue = initialized ? contenido : (data?.contenido ?? '');

  // Validate variables for save-block (F-030b)
  const allVars = parseVariables(editorValue);
  const invalidas = allVars.filter((v) => !v.valido);
  const hasInvalid = invalidas.length > 0;

  // Variables offered in the "Declarar variables" modal (PLAN-04):
  // - valid variables only
  // - declarable types (expediente/contacto) ALREADY in the esquema are hidden
  //   (so a field disappears once declared — esquema refetched on declare)
  // - non-declarable types (clausula/fecha) are still shown, rendered as
  //   "no declarable" by the modal (Pitfall 4 / D-03)
  // - de-duplicated by tipoObjeto|campo (same field can occur many times in content)
  const declaredCampos = new Set<string>([
    ...(esqExpediente?.parametros ?? []).map((p) => `expediente|${p.nombre}`),
    ...(esqContacto?.parametros ?? []).map((p) => `contacto|${p.nombre}`),
  ]);

  const declarableVars: VariableDetectada[] = [];
  const seenCampos = new Set<string>();
  for (const v of allVars) {
    if (!v.valido) continue;
    const key = `${v.tipoObjeto}|${v.campo}`;
    if (seenCampos.has(key)) continue;
    const esDeclarable = v.tipoObjeto === 'expediente' || v.tipoObjeto === 'contacto';
    if (esDeclarable && declaredCampos.has(key)) continue; // already declared → hide
    seenCampos.add(key);
    declarableVars.push(v);
  }

  // Compute afterNumero for InsertarClausulaModal: last detected clause header (most common MVP case).
  function getAfterNumero(): number {
    const headers = detectClausulaHeaders(editorValue);
    if (headers.length === 0) return 0;
    return headers[headers.length - 1].numero;
  }

  const updateMut = useMutation({
    mutationFn: (input: { contenido: string }) =>
      updatePlantilla(id, { contenido: input.contenido }),
    onSuccess: (nuevaVersion) => {
      setApiError(null);
      // PLAN-06: saving creates a NEW version with a new _id and deactivates the
      // prior one. Navigate to the new active version so the page — and follow-up
      // actions (Declarar/Insertar, which key off the URL id) — reference the
      // active version instead of the now-inactive prior id.
      if (nuevaVersion?._id && nuevaVersion._id !== id) {
        qc.setQueryData(['plantilla', nuevaVersion._id], nuevaVersion);
        router.replace(`/plantillas/${nuevaVersion._id}`);
      } else {
        qc.invalidateQueries({ queryKey: ['plantilla', id] });
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) setApiError(err.message);
      else setApiError((err as Error).message);
    },
  });

  function handleGuardar() {
    if (hasInvalid) return;
    setApiError(null);
    updateMut.mutate({ contenido: editorValue });
  }

  function handleInsert(nuevoContenido: string) {
    setContenido(nuevoContenido);
  }

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (!data) return <p className="text-gray-500">Plantilla no encontrada</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{data.nombre}</h2>
          <p className="text-sm text-gray-500">
            Version {data.version} — Guardar crea una nueva version (PLAN-06)
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/plantillas')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Volver
        </button>
      </div>

      {apiError && (
        <p className="text-sm text-red-600" role="alert">
          Error: {apiError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlantillaEditor ref={editorRef} value={editorValue} onChange={setContenido} />
        </div>
        <div>
          <VariablesPanel contenido={editorValue} />
        </div>
      </div>

      {hasInvalid && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Tipos de objeto desconocidos — no se puede guardar:</p>
          <ul className="mt-1 list-disc pl-5">
            {invalidas.map((v) => (
              <li key={`${v.tipoObjeto}-${v.linea}-${v.columna}`}>
                {v.raw} (linea {v.linea})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={updateMut.isPending || hasInvalid}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateMut.isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => setShowInsertarModal(true)}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Insertar clausula
        </button>
        <button
          type="button"
          onClick={() => setShowDeclararModal(true)}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Declarar variables
        </button>
      </div>

      {showInsertarModal && (
        <InsertarClausulaModal
          contenido={editorValue}
          afterNumero={getAfterNumero()}
          onInsert={handleInsert}
          onClose={() => setShowInsertarModal(false)}
        />
      )}

      {showDeclararModal && (
        <DeclararVariableModal
          plantillaId={id}
          nuevasVariables={declarableVars}
          onClose={() => setShowDeclararModal(false)}
          onDeclared={() => {
            setShowDeclararModal(false);
            // Refetch esquemas so the just-declared field disappears from the list.
            qc.invalidateQueries({ queryKey: ['esquema'] });
            qc.invalidateQueries({ queryKey: ['plantilla', id] });
          }}
        />
      )}
    </div>
  );
}
