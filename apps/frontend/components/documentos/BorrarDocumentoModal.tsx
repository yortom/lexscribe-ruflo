'use client';

interface BorrarDocumentoModalProps {
  count: number;
  onConfirm: (action: 'conservar' | 'eliminar') => void;
  onClose: () => void;
}

/**
 * BorrarDocumentoModal — FL-9 (D-10) confirmation modal for deleting a document with events.
 * Shows event count and two action buttons: Conservar eventos / Eliminar eventos.
 */
export function BorrarDocumentoModal({ count, onConfirm, onClose }: BorrarDocumentoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm space-y-4 rounded-md bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Eliminar documento</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cerrar
          </button>
        </div>

        <p className="text-sm text-gray-700">
          Este documento tiene{' '}
          <strong>{count} evento(s)</strong> asociado(s). ¿Conservar o eliminar los eventos del
          expediente?
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm('conservar')}
            className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Conservar eventos
          </button>
          <button
            type="button"
            onClick={() => onConfirm('eliminar')}
            className="w-full rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Eliminar eventos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
