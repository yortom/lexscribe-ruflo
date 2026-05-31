/**
 * Variable parser for plantilla templates.
 * Detects {{objeto.campo}} and {{objeto.rol.campo}} markers (FUNCIONAL §5.2, F-023, F-030b).
 * Pure module — zero dependencies.
 */

/** Valid template tipoObjeto values per FUNCIONAL §5.2 + F-030b.
 *  NOTE: Intentionally SEPARATE from esquemas.TIPO_OBJETO which only covers
 *  expediente/contacto for addParametro. The parser recognizes all 4 valid types. */
export const KNOWN_TIPO_OBJETO = [
  'expediente',
  'contacto',
  'clausula',
  'fecha',
] as const;

export type KnownTipoObjeto = (typeof KNOWN_TIPO_OBJETO)[number];

/** Shape of a detected variable occurrence (DATOS §4.3 variablesDetectadas). */
export interface VariableDetectada {
  raw: string; // "{{contacto.vendedor.nombre}}"
  tipoObjeto: string; // "contacto" — string (NOT KnownTipoObjeto; may be unknown)
  rol: string | null; // "vendedor" or null for two-part variables
  campo: string; // "nombre"
  esArray: boolean; // F-025 heuristic — always false in MVP
  valido: boolean; // tipoObjeto is in KNOWN_TIPO_OBJETO
  linea: number; // 1-based line number
  columna: number; // 1-based column of {{ on that line
}

/**
 * Regex for variable detection:
 * - NO whitespace inside braces (rule 1, FUNCIONAL §5.2)
 * - Identifiers: [a-zA-Z][a-zA-Z0-9_]* (lowercase/camelCase, no tildes, no spaces)
 * - 2-part: {{g1.g2}} -> tipoObjeto=g1, rol=null, campo=g2
 * - 3-part: {{g1.g2.g3}} -> tipoObjeto=g1, rol=g2, campo=g3
 */
const VARIABLE_RE =
  /\{\{([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z][a-zA-Z0-9_]*)(?:\.([a-zA-Z][a-zA-Z0-9_]*))?\}\}/g;

/**
 * Parse all {{objeto.campo}} / {{objeto.rol.campo}} occurrences in texto.
 * Returns all occurrences in document order (no dedupe — use groupByTipoObjeto for deduped view).
 * F-025 iteration syntax {{#each ...}} is post-MVP and is NOT parsed here.
 */
export function parseVariables(texto: string): VariableDetectada[] {
  const result: VariableDetectada[] = [];
  const lines = texto.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Reset lastIndex for each line to start fresh
    const re = new RegExp(VARIABLE_RE.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = re.exec(line)) !== null) {
      const g1 = match[1]; // primera parte — tipoObjeto
      const g2 = match[2]; // segunda parte
      const g3 = match[3]; // tercera parte (optional)

      const tipoObjeto = g1;
      const rol = g3 !== undefined ? g2 : null;
      const campo = g3 !== undefined ? g3 : g2;

      const valido = (KNOWN_TIPO_OBJETO as readonly string[]).includes(tipoObjeto);

      result.push({
        raw: match[0],
        tipoObjeto,
        rol,
        campo,
        esArray: false, // F-025 post-MVP; do NOT parse {{#each}}
        valido,
        linea: i + 1, // 1-based
        columna: match.index + 1, // 1-based position of {{ on this line
      });
    }
  }

  return result;
}

/** Grouped representation of variables by tipoObjeto. */
export interface GrupoVariables {
  tipoObjeto: string;
  valido: boolean;
  variables: VariableDetectada[];
}

/**
 * Group variables by tipoObjeto.
 * Within each group, dedupes by (rol ?? '') + '|' + campo (keeps first occurrence).
 * Preserves group insertion order.
 */
export function groupByTipoObjeto(vars: VariableDetectada[]): GrupoVariables[] {
  const groupMap = new Map<string, GrupoVariables>();
  const seenKeys = new Map<string, Set<string>>();

  for (const v of vars) {
    if (!groupMap.has(v.tipoObjeto)) {
      groupMap.set(v.tipoObjeto, {
        tipoObjeto: v.tipoObjeto,
        valido: v.valido,
        variables: [],
      });
      seenKeys.set(v.tipoObjeto, new Set());
    }

    const dedupeKey = (v.rol ?? '') + '|' + v.campo;
    const seen = seenKeys.get(v.tipoObjeto)!;

    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      groupMap.get(v.tipoObjeto)!.variables.push(v);
    }
  }

  return Array.from(groupMap.values());
}

/** Result of variable validation (F-030b save-block logic lives in backend). */
export interface ResultadoValidacion {
  valido: boolean;
  invalidas: VariableDetectada[];
}

/**
 * Validate an array of detected variables.
 * invalidas = variables where valido === false (unknown tipoObjeto per F-030b).
 * valido = invalidas.length === 0.
 */
export function validarVariables(vars: VariableDetectada[]): ResultadoValidacion {
  const invalidas = vars.filter((v) => !v.valido);
  return {
    valido: invalidas.length === 0,
    invalidas,
  };
}
