'use client';
/**
 * Nueva plantilla page (PLAN-01).
 * Two creation modes:
 *  (a) paste/type — nombre + PlantillaEditor + VariablesPanel
 *  (b) upload — .txt reads text into editor, .docx calls uploadPlantilla
 *
 * Guardar is client-blocked if any !valido variables (F-030b).
 */
import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PlantillaEditor, PlantillaEditorHandle } from '@/components/plantillas/PlantillaEditor';
import { VariablesPanel } from '@/components/plantillas/VariablesPanel';
import { createPlantilla, uploadPlantilla, ApiError } from '@/lib/api/plantillas';
import { parseVariables } from '@lexscribe/shared-validation';

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const editorRef = useRef<PlantillaEditorHandle>(null);

  const [nombre, setNombre] = useState('');
  const [contenido, setContenido] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Validate: any unknown-type variables block save (F-030b)
  const allVars = parseVariables(contenido);
  const invalidas = allVars.filter((v) => !v.valido);
  const hasInvalid = invalidas.length > 0;

  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof createPlantilla>[0]) => createPlantilla(data),
    onSuccess: (plantilla) => router.push(`/plantillas/${plantilla._id}`),
    onError: (err) => {
      if (err instanceof ApiError) setApiError(err.message);
      else setApiError((err as Error).message);
    },
  });

  const uploadMut = useMutation({
    mutationFn: ({ file, nom }: { file: File; nom: string }) => uploadPlantilla(file, nom),
    onSuccess: (plantilla) => router.push(`/plantillas/${plantilla._id}`),
    onError: (err) => {
      if (err instanceof ApiError) setApiError(err.message);
      else setApiError((err as Error).message);
    },
  });

  const isPending = createMut.isPending || uploadMut.isPending;

  function handleGuardar() {
    if (!nombre.trim()) {
      setApiError('El nombre es obligatorio');
      return;
    }
    if (hasInvalid) return; // blocked client-side
    setApiError(null);
    createMut.mutate({ nombre, contenido, formatoOriginal: 'pegado' });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setApiError(null);

    if (file.name.endsWith('.docx')) {
      if (!nombre.trim()) {
        setApiError('Introduce un nombre antes de subir el archivo');
        return;
      }
      uploadMut.mutate({ file, nom: nombre });
      return;
    }

    // .txt or other text files: read content into editor
    const text = await file.text();
    setContenido(text);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nueva plantilla</h2>

      {apiError && (
        <p className="text-sm text-red-600" role="alert">
          Error: {apiError}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la plantilla"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Subir archivo (.txt o .docx)
        </label>
        <input
          type="file"
          accept=".txt,.docx"
          onChange={handleFileChange}
          className="text-sm text-gray-600"
        />
        <p className="mt-1 text-xs text-gray-400">
          .txt: carga el texto en el editor. .docx: sube directamente al servidor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Contenido</label>
          <PlantillaEditor ref={editorRef} value={contenido} onChange={setContenido} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Variables</label>
          <VariablesPanel contenido={contenido} />
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={isPending || hasInvalid}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/plantillas')}
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
