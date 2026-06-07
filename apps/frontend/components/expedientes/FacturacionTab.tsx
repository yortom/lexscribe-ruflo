'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstadoFactura, Factura } from '@lexscribe/shared-types';
import type { CreateFacturaInput, UpdateFacturaInput } from '@lexscribe/shared-validation';
import {
  listFacturas,
  getTotalesFactura,
  createFactura,
  updateFactura,
  updateEstadoFactura,
  deleteFactura,
} from '@/lib/api/facturacion';

interface FacturacionTabProps {
  expedienteId: string;
}

/** Format a number as EUR currency in es-ES locale (e.g. 150,50 €) */
const fmt = (v: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);

/** Badge color classes per estado */
const ESTADO_CLASSES: Record<EstadoFactura, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  facturado: 'bg-blue-100 text-blue-700',
  cobrado: 'bg-green-100 text-green-700',
};

/** Inline edit state for a row — tracks field values while editing */
interface DraftEdit {
  concepto: string;
  importe: string;
  fecha: string;
  numero: string;
  notas: string;
}

function toDateInput(iso: string): string {
  // Convert ISO string to YYYY-MM-DD for <input type="date">
  return iso.slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A single existing row in view/edit mode */
function FacturaRow({
  factura,
  expedienteId,
}: {
  factura: Factura;
  expedienteId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftEdit>({
    concepto: factura.concepto,
    importe: String(factura.importe),
    fecha: toDateInput(factura.fecha),
    numero: factura.numero ?? '',
    notas: factura.notas ?? '',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['facturas', expedienteId] });
    qc.invalidateQueries({ queryKey: ['facturas', 'totales', expedienteId] });
  };

  const updateMut = useMutation({
    mutationFn: (patch: UpdateFacturaInput) => updateFactura(factura._id, patch),
    onSuccess: invalidate,
  });

  const estadoMut = useMutation({
    mutationFn: (estado: EstadoFactura) => updateEstadoFactura(factura._id, estado),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFactura(factura._id),
    onSuccess: invalidate,
  });

  function handleSave() {
    const patch: UpdateFacturaInput = {
      concepto: draft.concepto,
      importe: parseFloat(draft.importe),
      fecha: draft.fecha ? new Date(draft.fecha).toISOString() : undefined,
      numero: draft.numero || null,
      notas: draft.notas || null,
    };
    updateMut.mutate(patch, { onSuccess: () => setEditing(false) });
  }

  function handleEstadoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    estadoMut.mutate(e.target.value as EstadoFactura);
  }

  if (editing) {
    return (
      <tr className="bg-gray-50">
        <td className="px-3 py-2">
          <input
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            value={draft.concepto}
            onChange={(e) => setDraft((d) => ({ ...d, concepto: e.target.value }))}
            aria-label="concepto"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
            value={draft.importe}
            onChange={(e) => setDraft((d) => ({ ...d, importe: e.target.value }))}
            aria-label="importe"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="date"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={draft.fecha}
            onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
            aria-label="fecha"
          />
        </td>
        <td className="px-3 py-2">
          <input
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Nro."
            value={draft.numero}
            onChange={(e) => setDraft((d) => ({ ...d, numero: e.target.value }))}
            aria-label="numero"
          />
        </td>
        <td className="px-3 py-2">
          <input
            className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="Notas"
            value={draft.notas}
            onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
            aria-label="notas"
          />
        </td>
        <td className="px-3 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[factura.estado]}`}
          >
            {factura.estado}
          </span>
        </td>
        <td className="space-x-1 px-3 py-2 text-sm">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
          >
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900">{factura.concepto}</td>
      <td className="px-3 py-2 text-sm text-gray-900 tabular-nums">{fmt(factura.importe)}</td>
      <td className="px-3 py-2 text-sm text-gray-500">{toDateInput(factura.fecha)}</td>
      <td className="px-3 py-2 text-sm text-gray-500">{factura.numero ?? '—'}</td>
      <td className="px-3 py-2 text-sm text-gray-500">{factura.notas ?? '—'}</td>
      <td className="px-3 py-2">
        <select
          value={factura.estado}
          onChange={handleEstadoChange}
          disabled={estadoMut.isPending}
          className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium ${ESTADO_CLASSES[factura.estado]} disabled:opacity-50`}
        >
          <option value="pendiente">pendiente</option>
          <option value="facturado">facturado</option>
          <option value="cobrado">cobrado</option>
        </select>
      </td>
      <td className="space-x-1 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setDraft({
              concepto: factura.concepto,
              importe: String(factura.importe),
              fecha: toDateInput(factura.fecha),
              numero: factura.numero ?? '',
              notas: factura.notas ?? '',
            });
            setEditing(true);
          }}
          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => deleteMut.mutate()}
          disabled={deleteMut.isPending}
          className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}

/** Draft new row shown when "Nueva entrada" is clicked */
interface NewRowDraft {
  concepto: string;
  importe: string;
  fecha: string;
  numero: string;
  notas: string;
}

function NewFacturaRow({
  expedienteId,
  onCancel,
}: {
  expedienteId: string;
  onCancel: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<NewRowDraft>({
    concepto: '',
    importe: '',
    fecha: todayISO(),
    numero: '',
    notas: '',
  });

  const createMut = useMutation({
    mutationFn: (input: CreateFacturaInput) => createFactura(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas', expedienteId] });
      qc.invalidateQueries({ queryKey: ['facturas', 'totales', expedienteId] });
      onCancel();
    },
  });

  function handleSave() {
    if (!draft.concepto.trim() || !draft.importe) return;
    const input: CreateFacturaInput = {
      expedienteId,
      concepto: draft.concepto.trim(),
      importe: parseFloat(draft.importe),
      fecha: draft.fecha ? new Date(draft.fecha).toISOString() : undefined,
      numero: draft.numero || null,
      notas: draft.notas || null,
      estado: 'pendiente',
    };
    createMut.mutate(input);
  }

  return (
    <tr className="border-t border-blue-100 bg-blue-50">
      <td className="px-3 py-2">
        <input
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="Concepto*"
          value={draft.concepto}
          onChange={(e) => setDraft((d) => ({ ...d, concepto: e.target.value }))}
          autoFocus
          aria-label="nuevo concepto"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="0.00"
          value={draft.importe}
          onChange={(e) => setDraft((d) => ({ ...d, importe: e.target.value }))}
          aria-label="nuevo importe"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="date"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={draft.fecha}
          onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
          aria-label="nueva fecha"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="Nro."
          value={draft.numero}
          onChange={(e) => setDraft((d) => ({ ...d, numero: e.target.value }))}
          aria-label="nuevo numero"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="Notas"
          value={draft.notas}
          onChange={(e) => setDraft((d) => ({ ...d, notas: e.target.value }))}
          aria-label="nuevas notas"
        />
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          pendiente
        </span>
      </td>
      <td className="space-x-1 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={handleSave}
          disabled={createMut.isPending || !draft.concepto.trim()}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
        >
          Cancelar
        </button>
      </td>
    </tr>
  );
}

/**
 * FacturacionTab — inline editable billing table with per-row status dropdown
 * and a header showing total + per-status subtotals (€ es-ES).
 * Covers FAC-01..05.
 */
export function FacturacionTab({ expedienteId }: FacturacionTabProps) {
  const [addingNew, setAddingNew] = useState(false);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['facturas', expedienteId],
    queryFn: () => listFacturas(expedienteId),
  });

  const { data: totales, isLoading: totalesLoading } = useQuery({
    queryKey: ['facturas', 'totales', expedienteId],
    queryFn: () => getTotalesFactura(expedienteId),
  });

  if (listLoading || totalesLoading) {
    return <p className="text-sm text-gray-500">Cargando facturación...</p>;
  }

  const facturas = listData?.items ?? [];

  return (
    <div className="space-y-4">
      {/* D-14: totals header */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-sm font-semibold text-gray-800">
          Total:{' '}
          <span className="text-base text-gray-900">{fmt(totales?.total ?? 0)}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
            Pendiente {fmt(totales?.pendiente ?? 0)}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Facturado {fmt(totales?.facturado ?? 0)}
          </span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
            Cobrado {fmt(totales?.cobrado ?? 0)}
          </span>
        </div>
      </div>

      {/* D-12: inline editable table */}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Importe</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Notas</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 && !addingNew && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-sm text-gray-400">
                  Sin entradas de facturación
                </td>
              </tr>
            )}
            {facturas.map((factura) => (
              <FacturaRow key={factura._id} factura={factura} expedienteId={expedienteId} />
            ))}
            {addingNew && (
              <NewFacturaRow expedienteId={expedienteId} onCancel={() => setAddingNew(false)} />
            )}
          </tbody>
        </table>
      </div>

      {/* Add new entry button */}
      {!addingNew && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
        >
          + Nueva entrada
        </button>
      )}
    </div>
  );
}
