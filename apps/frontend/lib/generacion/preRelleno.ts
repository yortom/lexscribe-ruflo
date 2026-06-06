import type { VariableDetectada } from '@lexscribe/shared-validation';

/**
 * Resultado del pre-relleno del formulario de generación (D-03).
 * Estructura de valores iniciales agrupada por tipoObjeto más
 * los roles requeridos y los roles ya presentes en el expediente.
 */
export interface PreRellenoResult {
  valores: {
    expediente: Record<string, unknown>;
    contacto: Record<string, Record<string, unknown>>;
    clausula: Record<string, Record<string, unknown>>;
    fecha: Record<string, unknown>;
  };
  /** Roles distintos detectados en variables de tipoObjeto 'contacto' con rol != null */
  rolesRequeridos: string[];
  /** Roles ya vinculados en el expediente (expediente.contactos[*].rol) */
  rolesPresentes: string[];
}

/**
 * Pre-rellena el formulario de generación con datos ya existentes del expediente
 * y de los contactos vinculados (D-03: pre-relleno máximo).
 *
 * @param vars  Variables detectadas en la plantilla (groupByTipoObjeto output o raw list).
 * @param expediente  Expediente con parametros, nombre y contactos vinculados.
 * @param contactoFieldsByRol  Mapa rol → campos del contacto resueltos por el caller.
 */
export function preRellenarFormulario(
  vars: VariableDetectada[],
  expediente: {
    parametros: Record<string, unknown>;
    nombre: string;
    contactos: { contactoId: string; rol: string }[];
  },
  contactoFieldsByRol: Record<string, Record<string, unknown>>,
): PreRellenoResult {
  const valores: PreRellenoResult['valores'] = {
    expediente: {},
    contacto: {},
    clausula: {},
    fecha: {},
  };

  const rolesRequeridosSet = new Set<string>();

  for (const v of vars) {
    if (v.tipoObjeto === 'expediente') {
      // expediente.nombre se toma directamente del campo nombre; el resto de parametros
      const value =
        v.campo === 'nombre'
          ? expediente.nombre
          : expediente.parametros[v.campo];
      if (value !== undefined) {
        valores.expediente[v.campo] = value;
      }
    } else if (v.tipoObjeto === 'contacto' && v.rol != null) {
      rolesRequeridosSet.add(v.rol);
      if (!valores.contacto[v.rol]) {
        valores.contacto[v.rol] = {};
      }
      const campoValue = contactoFieldsByRol[v.rol]?.[v.campo];
      if (campoValue !== undefined) {
        valores.contacto[v.rol][v.campo] = campoValue;
      }
    } else if (v.tipoObjeto === 'clausula' && v.rol != null) {
      if (!valores.clausula[v.rol]) {
        valores.clausula[v.rol] = {};
      }
    } else if (v.tipoObjeto === 'fecha') {
      // fecha variables sin valor inicial predeterminado (usuario las rellena)
      if (!(v.campo in valores.fecha)) {
        valores.fecha[v.campo] = '';
      }
    }
  }

  const rolesPresentes = expediente.contactos.map((c) => c.rol);

  return {
    valores,
    rolesRequeridos: Array.from(rolesRequeridosSet),
    rolesPresentes,
  };
}
