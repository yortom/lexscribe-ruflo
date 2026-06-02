'use client';
/**
 * Variables panel for the plantilla editor.
 * Groups detected variables by tipoObjeto, showing valid groups in blue
 * and unknown types with a red "tipo desconocido" badge (F-030b, PLAN-05).
 */
import { useMemo } from 'react';
import { parseVariables, groupByTipoObjeto } from '@lexscribe/shared-validation';
import type { VariableDetectada } from '@lexscribe/shared-validation';

interface VariablesPanelProps {
  contenido: string;
  /** Optional: called when user clicks a variable item. */
  onVariableClick?: (v: VariableDetectada) => void;
}

export function VariablesPanel({ contenido, onVariableClick }: VariablesPanelProps) {
  const grupos = useMemo(
    () => groupByTipoObjeto(parseVariables(contenido)),
    [contenido],
  );

  if (grupos.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 p-3">
        <p className="text-xs text-gray-400">Sin variables detectadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variables</h3>
      {grupos.map((grupo) => (
        <div key={grupo.tipoObjeto} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">{grupo.tipoObjeto}</span>
            {!grupo.valido && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                tipo desconocido
              </span>
            )}
          </div>
          <ul className="ml-2 space-y-0.5">
            {grupo.variables.map((v) => {
              const label = v.rol ? `${v.rol}.${v.campo}` : v.campo;
              return (
                <li
                  key={`${v.tipoObjeto}-${v.rol ?? ''}-${v.campo}`}
                  className={
                    onVariableClick
                      ? 'cursor-pointer text-xs text-gray-600 hover:text-blue-600'
                      : 'text-xs text-gray-600'
                  }
                  onClick={() => onVariableClick?.(v)}
                >
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
