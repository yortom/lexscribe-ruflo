'use client';
/**
 * DeclararVariableModal — declare new dynamic-schema fields from the editor (PLAN-04, FL-13).
 *
 * Props:
 *   plantillaId: ID of the plantilla being edited
 *   nuevasVariables: variables to show (parent provides valido ones with unknown campo).
 *   onClose: called to dismiss the modal
 *   onDeclared: called after all declarations succeed
 *
 * IMPORTANT (Pitfall 4 / D-03): only tipoObjeto ∈ {expediente, contacto} are declarable.
 * Variables of tipoObjeto clausula/fecha are shown as "no declarable" and their row is disabled.
 */
import { useState } from 'react';
import type { VariableDetectada } from '@lexscribe/shared-validation';
import { declararVariable } from '@/lib/api/plantillas';

type TipoDato = 'texto' | 'numero' | 'fecha' | 'booleano';

const DECLARABLE_TIPOS = ['expediente', 'contacto'] as const;
function isDeclarable(tipoObjeto: string): tipoObjeto is 'expediente' | 'contacto' {
  return (DECLARABLE_TIPOS as readonly string[]).includes(tipoObjeto);
}

interface DeclararVariableModalProps {
  plantillaId: string;
  nuevasVariables: VariableDetectada[];
  onClose: () => void;
  onDeclared: () => void;
}

export function DeclararVariableModal({
  plantillaId,
  nuevasVariables,
  onClose,
  onDeclared,
}: DeclararVariableModalProps) {
  // State per declarable variable: tipoDato selection
  const [tipoDatos, setTipoDatos] = useState<Record<string, TipoDato>>(() => {
    const initial: Record<string, TipoDato> = {};
    for (const v of nuevasVariables) {
      if (isDeclarable(v.tipoObjeto)) {
        initial[`${v.tipoObjeto}|${v.campo}`] = 'texto';
      }
    }
    return initial;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeclarar(v: VariableDetectada) {
    if (!isDeclarable(v.tipoObjeto)) return;
    const key = `${v.tipoObjeto}|${v.campo}`;
    const tipoDato = tipoDatos[key] ?? 'texto';
    setPending(true);
    setError(null);
    try {
      await declararVariable(plantillaId, {
        tipoObjeto: v.tipoObjeto,
        nombre: v.campo,
        tipoDato,
      });
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
      return;
    }
    setPending(false);
    onDeclared();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Declarar variables"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Declarar variables</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {nuevasVariables.length === 0 && (
          <p className="text-sm text-gray-500">No hay variables nuevas que declarar.</p>
        )}

        <ul className="space-y-3">
          {nuevasVariables.map((v) => {
            const key = `${v.tipoObjeto}|${v.campo}`;
            const declarable = isDeclarable(v.tipoObjeto);
            const label = `${v.tipoObjeto}.${v.campo}`;

            return (
              <li
                key={key}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  declarable ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-800">{label}</span>

                {declarable ? (
                  <>
                    <select
                      value={tipoDatos[key] ?? 'texto'}
                      onChange={(e) =>
                        setTipoDatos((prev) => ({
                          ...prev,
                          [key]: e.target.value as TipoDato,
                        }))
                      }
                      className="mx-3 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Tipo de dato para ${label}`}
                    >
                      <option value="texto">texto</option>
                      <option value="numero">numero</option>
                      <option value="fecha">fecha</option>
                      <option value="booleano">booleano</option>
                    </select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeclarar(v)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Declarar
                    </button>
                  </>
                ) : (
                  <span className="ml-3 text-xs text-gray-400" aria-label={`${label} no declarable`}>
                    no declarable
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
