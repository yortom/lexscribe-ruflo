'use client';
import type { GrupoVariables, VariableDetectada } from '@lexscribe/shared-validation';

/** Etiqueta legible por tipoObjeto (D-02) */
function labelForTipoObjeto(tipoObjeto: string): string {
  switch (tipoObjeto) {
    case 'expediente':
      return 'Datos del expediente';
    case 'contacto':
      return 'Contactos por rol';
    case 'clausula':
      return 'Clausulas';
    case 'fecha':
      return 'Fechas';
    default:
      return tipoObjeto;
  }
}

/** Nombre de campo descriptivo para mostrar en el label */
function labelForVariable(v: VariableDetectada): string {
  if (v.rol) return `${v.rol}.${v.campo}`;
  return v.campo;
}

interface GeneracionFormSectionProps {
  grupo: GrupoVariables;
  /** Valor actual del campo: (rol|'') + '|' + campo -> valor */
  valores: Record<string, unknown>;
  /** Campos marcados como "nuevo" (no en esquema): llave (rol|'') + '|' + campo */
  camposNuevos: Set<string>;
  /** Tipo elegido para cada campo nuevo: (rol|'') + '|' + campo -> tipoDato */
  tiposCamposNuevos: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onTipoCampoNuevo: (key: string, tipo: string) => void;
}

/**
 * Renderiza una sección del formulario de generación para un grupo de variables (D-02).
 * Muestra badge "nuevo" + selector de tipo para campos no existentes en el esquema (D-08).
 */
export function GeneracionFormSection({
  grupo,
  valores,
  camposNuevos,
  tiposCamposNuevos,
  onChange,
  onTipoCampoNuevo,
}: GeneracionFormSectionProps) {
  return (
    <fieldset className="rounded-md border border-gray-200 p-4">
      <legend className="px-2 text-sm font-semibold text-gray-700">
        {labelForTipoObjeto(grupo.tipoObjeto)}
      </legend>

      <div className="mt-2 space-y-3">
        {grupo.variables.map((v) => {
          const key = (v.rol ?? '') + '|' + v.campo;
          const value = String(valores[key] ?? '');
          const esNuevo = camposNuevos.has(key);
          const tipoDato = tiposCamposNuevos[key] ?? 'texto';

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {labelForVariable(v)}
                </label>
                {esNuevo && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    nuevo
                  </span>
                )}
                {esNuevo && (
                  <select
                    value={tipoDato}
                    onChange={(e) => onTipoCampoNuevo(key, e.target.value)}
                    className="rounded border border-amber-300 px-2 py-0.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    aria-label={`Tipo para ${labelForVariable(v)}`}
                  >
                    <option value="texto">texto</option>
                    <option value="numero">numero</option>
                    <option value="fecha">fecha</option>
                    <option value="booleano">booleano</option>
                  </select>
                )}
              </div>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={labelForVariable(v)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
