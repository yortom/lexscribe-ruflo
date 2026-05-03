'use client';
import { useState, useEffect } from 'react';

interface ParamRow {
  nombre: string;
  valor: string;
  error?: string;
}

interface ParametrosEditorProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

const NOMBRE_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function ParametrosEditor({ value, onChange }: ParametrosEditorProps) {
  const [rows, setRows] = useState<ParamRow[]>(() =>
    Object.entries(value).map(([nombre, v]) => ({
      nombre,
      valor: String(v ?? ''),
    })),
  );

  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.nombre && NOMBRE_RE.test(row.nombre)) {
        next[row.nombre] = row.valor;
      }
    }
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function addRow() {
    setRows((prev) => [...prev, { nombre: '', valor: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateNombre(index: number, nombre: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const error =
          nombre && !NOMBRE_RE.test(nombre)
            ? 'Name must start with a letter and contain only letters, digits, and underscores'
            : undefined;
        return { ...row, nombre, error };
      }),
    );
  }

  function updateValor(index: number, valor: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, valor } : row)),
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="text"
              placeholder="name"
              value={row.nombre}
              onChange={(e) => updateNombre(i, e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {row.error && (
              <span className="text-xs text-red-600">{row.error}</span>
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="value"
              value={row.valor}
              onChange={(e) => updateValor(i, e.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="text-red-500 hover:text-red-700 text-sm px-1"
            aria-label="Remove parameter"
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-blue-600 hover:underline"
      >
        + Añadir parámetro
      </button>
    </div>
  );
}
