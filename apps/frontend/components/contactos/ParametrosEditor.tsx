'use client';
import { useEffect, useState } from 'react';

type TipoDato = 'texto' | 'numero' | 'fecha' | 'booleano';

interface ParamRow {
  nombre: string;
  tipoDato: TipoDato;
  valor: string;
  error?: string;
}

interface ParametrosEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

const NOMBRE_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function inferTipoDato(value: unknown): TipoDato {
  if (typeof value === 'number') return 'numero';
  if (typeof value === 'boolean') return 'booleano';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'fecha';
  }
  return 'texto';
}

function serializeValor(valor: string, tipoDato: TipoDato): unknown {
  if (tipoDato === 'numero') return valor === '' ? undefined : Number(valor);
  if (tipoDato === 'booleano') return valor === 'true';
  return valor;
}

export function ParametrosEditor({ value, onChange }: ParametrosEditorProps) {
  const [rows, setRows] = useState<ParamRow[]>(() =>
    Object.entries(value).map(([nombre, v]) => ({
      nombre,
      tipoDato: inferTipoDato(v),
      valor: String(v ?? ''),
    })),
  );

  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.nombre && NOMBRE_RE.test(row.nombre)) {
        next[row.nombre] = serializeValor(row.valor, row.tipoDato);
      }
    }
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function addRow() {
    setRows((prev) => [...prev, { nombre: '', tipoDato: 'texto', valor: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<ParamRow>) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        const error =
          next.nombre && !NOMBRE_RE.test(next.nombre)
            ? 'Debe empezar por letra y usar solo letras, numeros o guion bajo'
            : undefined;
        return { ...next, error };
      }),
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
          <div>
            <input
              type="text"
              placeholder="nombre"
              value={row.nombre}
              onChange={(e) => updateRow(i, { nombre: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {row.error && <span className="text-xs text-red-600">{row.error}</span>}
          </div>
          <select
            value={row.tipoDato}
            onChange={(e) => updateRow(i, { tipoDato: e.target.value as TipoDato })}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="texto">Texto</option>
            <option value="numero">Numero</option>
            <option value="fecha">Fecha</option>
            <option value="booleano">Booleano</option>
          </select>
          {row.tipoDato === 'booleano' ? (
            <select
              value={row.valor || 'false'}
              onChange={(e) => updateRow(i, { valor: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="false">No</option>
              <option value="true">Si</option>
            </select>
          ) : (
            <input
              type={row.tipoDato === 'fecha' ? 'date' : 'text'}
              placeholder="valor"
              value={row.valor}
              onChange={(e) => updateRow(i, { valor: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="px-2 text-sm text-red-600 hover:text-red-800"
            aria-label="Eliminar parametro"
          >
            x
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:underline">
        + Anadir parametro
      </button>
    </div>
  );
}
