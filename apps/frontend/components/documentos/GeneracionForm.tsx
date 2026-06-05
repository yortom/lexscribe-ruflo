'use client';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Plantilla, ExpedienteDetailResponse } from '@lexscribe/shared-types';
import { groupByTipoObjeto, type VariableDetectada } from '@lexscribe/shared-validation';
import { preRellenarFormulario } from '@/lib/generacion/preRelleno';
import { generarDocumento } from '@/lib/api/documentos';
import { GeneracionFormSection } from './GeneracionFormSection';
import { RolFaltanteModal } from './RolFaltanteModal';

/**
 * Adapts Plantilla.variablesDetectadas (shared-types, no valido/linea/columna)
 * to the full VariableDetectada shape from shared-validation.
 */
function adaptVars(vars: Plantilla['variablesDetectadas']): VariableDetectada[] {
  return vars.map((v) => ({
    ...v,
    valido: ['expediente', 'contacto', 'clausula', 'fecha'].includes(v.tipoObjeto),
    linea: 0,
    columna: 0,
  }));
}

interface GeneracionFormProps {
  expedienteId: string;
  plantilla: Plantilla;
  expediente: ExpedienteDetailResponse;
  /** Datos de contactos vinculados resueltos por el caller: rol -> campos */
  contactoFieldsByRol: Record<string, Record<string, unknown>>;
  /**
   * Nombres de los parámetros YA declarados en el esquema dinámico, por tipoObjeto.
   * Se usa para detectar campos nuevos (D-08): una variable expediente/contacto cuyo
   * `campo` no está en el esquema (ni es campo base) se marca como "nuevo" y se envía
   * en `camposNuevos` para auto-declararlo al generar (DOC-03 / FL-13 entrada C).
   * Si no se provee (esquema aún cargando), no se detectan campos nuevos.
   */
  esquemaCampos?: { expediente: string[]; contacto: string[] };
}

/** Campos base (no dinámicos) que nunca se consideran "nuevos". */
const CAMPOS_BASE: Record<'expediente' | 'contacto', Set<string>> = {
  expediente: new Set(['nombre', 'fechaCreacion']),
  contacto: new Set(['nombre']),
};

interface CampoNuevo {
  tipoObjeto: 'expediente' | 'contacto';
  rol?: string | null;
  nombre: string;
  tipoDato: 'texto' | 'numero' | 'fecha' | 'booleano';
}

/**
 * Formulario de generación de documentos (D-01/02/03/05/07-UX).
 * - Secciones agrupadas por tipoObjeto (D-02).
 * - Pre-rellena desde expediente/contactos (D-03).
 * - Badge "nuevo" + selector de tipo para campos no en esquema (D-08).
 * - Modal de rol faltante para asignar contacto (D-06).
 * - Botón Generar bloqueado con contador "Faltan N" hasta completitud (D-07).
 */
export function GeneracionForm({
  expedienteId,
  plantilla,
  expediente,
  contactoFieldsByRol,
  esquemaCampos,
}: GeneracionFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  // Inicializar pre-relleno
  const vars = adaptVars(plantilla.variablesDetectadas ?? []);
  const preRelleno = preRellenarFormulario(vars, expediente, contactoFieldsByRol);
  const grupos = groupByTipoObjeto(vars);

  // Detectar campos nuevos (D-08 / DOC-03): variables expediente|contacto cuyo `campo`
  // no está en el esquema dinámico ni es campo base. Derivado del esquema (no es estado).
  const camposNuevosSet = useMemo(() => {
    const set = new Set<string>();
    if (!esquemaCampos) return set; // esquema aún no cargado → no marcar nada
    const esq = {
      expediente: new Set(esquemaCampos.expediente),
      contacto: new Set(esquemaCampos.contacto),
    };
    for (const v of vars) {
      if (v.tipoObjeto !== 'expediente' && v.tipoObjeto !== 'contacto') continue;
      if (CAMPOS_BASE[v.tipoObjeto].has(v.campo)) continue;
      if (esq[v.tipoObjeto].has(v.campo)) continue;
      set.add((v.rol ?? '') + '|' + v.campo);
    }
    return set;
  }, [vars, esquemaCampos]);

  // Estado del formulario
  const [nombreDoc, setNombreDoc] = useState(`${plantilla.nombre} - ${today}`);
  const [asignacionesRol, setAsignacionesRol] = useState<{ rol: string; contactoId: string }[]>([]);

  // Mapa plano de valores: key = (rol|'') + '|' + campo -> valor string
  const [valores, setValores] = useState<Record<string, unknown>>(() => {
    const flat: Record<string, unknown> = {};
    // Expediente
    for (const [campo, val] of Object.entries(preRelleno.valores.expediente)) {
      flat[`|${campo}`] = val;
    }
    // Contacto por rol
    for (const [rol, camposRol] of Object.entries(preRelleno.valores.contacto)) {
      for (const [campo, val] of Object.entries(camposRol)) {
        flat[`${rol}|${campo}`] = val;
      }
    }
    // Fechas
    for (const [campo] of Object.entries(preRelleno.valores.fecha)) {
      flat[`|${campo}`] = '';
    }
    return flat;
  });

  // Estado de modal de rol faltante
  const [rolModalAbierto, setRolModalAbierto] = useState<string | null>(null);

  const [tiposCamposNuevos, setTiposCamposNuevos] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((key: string, value: string) => {
    setValores((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTipoCampoNuevo = useCallback((key: string, tipo: string) => {
    setTiposCamposNuevos((prev) => ({ ...prev, [key]: tipo }));
  }, []);

  // Roles resueltos = en expediente.contactos OR en asignacionesRol asignadas en este formulario
  const rolesResueltos = new Set([
    ...preRelleno.rolesPresentes,
    ...asignacionesRol.map((a) => a.rol),
  ]);

  // Calcular cuántos campos/roles faltan (D-07)
  const rolesQuefaltan = preRelleno.rolesRequeridos.filter((r) => !rolesResueltos.has(r));

  let camposFaltantes = 0;
  for (const grupo of grupos) {
    for (const v of grupo.variables) {
      const key = (v.rol ?? '') + '|' + v.campo;
      const val = valores[key];
      if (val === undefined || val === '' || val === null) {
        camposFaltantes++;
      }
    }
  }
  const faltan = camposFaltantes + rolesQuefaltan.length;

  // Construir valores estructurados para el DTO
  function buildValoresDto() {
    const dtov: {
      expediente: Record<string, unknown>;
      contacto: Record<string, Record<string, unknown>>;
      clausula: Record<string, Record<string, unknown>>;
      fecha: Record<string, unknown>;
    } = { expediente: {}, contacto: {}, clausula: {}, fecha: {} };

    for (const grupo of grupos) {
      for (const v of grupo.variables) {
        const key = (v.rol ?? '') + '|' + v.campo;
        const val = valores[key] ?? '';
        if (v.tipoObjeto === 'expediente') {
          dtov.expediente[v.campo] = val;
        } else if (v.tipoObjeto === 'contacto' && v.rol) {
          if (!dtov.contacto[v.rol]) dtov.contacto[v.rol] = {};
          dtov.contacto[v.rol][v.campo] = val;
        } else if (v.tipoObjeto === 'clausula' && v.rol) {
          if (!dtov.clausula[v.rol]) dtov.clausula[v.rol] = {};
          dtov.clausula[v.rol][v.campo] = val;
        } else if (v.tipoObjeto === 'fecha') {
          dtov.fecha[v.campo] = val;
        }
      }
    }
    return dtov;
  }

  function buildCamposNuevos(): CampoNuevo[] {
    const result: CampoNuevo[] = [];
    for (const key of camposNuevosSet) {
      const [rolPart, ...campoParts] = key.split('|');
      const campo = campoParts.join('|');
      const tipoDato = (tiposCamposNuevos[key] ?? 'texto') as CampoNuevo['tipoDato'];
      const tipoObjetoGrupo = grupos.find((g) =>
        g.variables.some((v) => (v.rol ?? '') === rolPart && v.campo === campo),
      )?.tipoObjeto;
      if (tipoObjetoGrupo === 'expediente' || tipoObjetoGrupo === 'contacto') {
        result.push({
          tipoObjeto: tipoObjetoGrupo,
          rol: rolPart || null,
          nombre: campo,
          tipoDato,
        });
      }
    }
    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (faltan > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await generarDocumento(expedienteId, {
        plantillaId: plantilla._id,
        nombre: nombreDoc,
        valores: buildValoresDto(),
        asignacionesRol,
        camposNuevos: buildCamposNuevos(),
      });
      router.push(`/expedientes/${expedienteId}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre del documento (D-04) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Nombre del documento</label>
        <input
          type="text"
          value={nombreDoc}
          onChange={(e) => setNombreDoc(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Secciones por tipoObjeto (D-02) */}
      {grupos.map((grupo) => (
        <GeneracionFormSection
          key={grupo.tipoObjeto}
          grupo={grupo}
          valores={valores}
          camposNuevos={camposNuevosSet}
          tiposCamposNuevos={tiposCamposNuevos}
          onChange={handleChange}
          onTipoCampoNuevo={handleTipoCampoNuevo}
        />
      ))}

      {/* Roles faltantes (D-06) */}
      {rolesQuefaltan.map((rol) => (
        <div key={rol} className="rounded-md border border-orange-200 bg-orange-50 p-3">
          <p className="text-sm text-orange-700">
            Rol requerido sin contacto asignado: <strong>{rol}</strong>
          </p>
          <button
            type="button"
            onClick={() => setRolModalAbierto(rol)}
            className="mt-2 rounded border border-orange-400 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Asignar contacto para rol {rol}
          </button>
        </div>
      ))}

      {/* Aviso campos nuevos (D-09) */}
      {camposNuevosSet.size > 0 && (
        <p className="text-sm text-amber-700">
          Se crean {camposNuevosSet.size} nuevo(s) campo(s) en el esquema.
        </p>
      )}

      {submitError && (
        <p className="text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}

      {/* Botón Generar con contador D-07 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={faltan > 0 || submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Generando...' : faltan > 0 ? `Generar (faltan ${faltan})` : 'Generar'}
        </button>
      </div>

      {/* Modal de rol faltante (D-06) */}
      {rolModalAbierto && (
        <RolFaltanteModal
          rol={rolModalAbierto}
          onAsignar={(contactoId) => {
            setAsignacionesRol((prev) => [
              ...prev.filter((a) => a.rol !== rolModalAbierto),
              { rol: rolModalAbierto, contactoId },
            ]);
            setRolModalAbierto(null);
          }}
          onClose={() => setRolModalAbierto(null)}
        />
      )}
    </form>
  );
}
