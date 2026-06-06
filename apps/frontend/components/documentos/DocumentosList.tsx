'use client';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  listDocumentos,
  downloadDocumento,
  uploadDocumento,
  deleteDocumento,
  ApiError,
} from '@/lib/api/documentos';

interface DocumentosListProps {
  expedienteId: string;
}

/**
 * Pestaña Documentos del expediente (EXPE-07 / DOC-05 / DOC-06).
 * Lista documentos reales (generados y subidos) con descarga, subida y eliminación.
 */
export function DocumentosList({ expedienteId }: DocumentosListProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadNombre, setUploadNombre] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documentos', expedienteId],
    queryFn: () => listDocumentos(expedienteId),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDocumento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documentos', expedienteId] });
    },
  });

  async function handleDownload(id: string) {
    try {
      const { url } = await downloadDocumento(id);
      window.open(url, '_blank');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !uploadNombre.trim()) return;
    setUploadError(null);
    try {
      await uploadDocumento(expedienteId, file, uploadNombre.trim());
      qc.invalidateQueries({ queryKey: ['documentos', expedienteId] });
      setUploadNombre('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError((err as Error).message);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documentos</h3>
        <button
          type="button"
          onClick={() => router.push(`/expedientes/${expedienteId}/documentos/nuevo`)}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Generar documento
        </button>
      </div>

      {/* Lista de documentos */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-gray-500">No hay documentos todavia.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {data.items.map((doc) => (
            <li
              key={doc._id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-gray-900">{doc.nombre}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      doc.tipo === 'generado'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {doc.tipo}
                  </span>
                  <span className="text-xs text-gray-500">.{doc.formato}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(doc.fechaCreacion).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(doc._id)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Descargar
                </button>
                <button
                  type="button"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(doc._id)}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Subir documento preexistente (DOC-06) */}
      <div className="rounded-md border border-gray-200 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Subir documento existente</h4>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600">Nombre</label>
            <input
              type="text"
              value={uploadNombre}
              onChange={(e) => setUploadNombre(e.target.value)}
              placeholder="Nombre del documento"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600">Archivo</label>
            <input
              type="file"
              accept=".docx,.pdf,.txt"
              ref={fileInputRef}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!uploadNombre.trim()}
            className="rounded bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Subir
          </button>
        </div>
        {uploadError && (
          <p className="text-sm text-red-600" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
