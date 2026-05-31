/**
 * Clause renumbering utility for plantilla editor (F-042, F-043, F-044).
 * Spanish ordinals 1-50 bidirectionally + header detection + insert-and-renumber.
 * Pure module — zero dependencies.
 */

/** Base ordinals 1-19 (feminine Spanish) */
const BASE_ORDINALS: readonly string[] = [
  '', // index 0 — sentinel
  'PRIMERA',
  'SEGUNDA',
  'TERCERA',
  'CUARTA',
  'QUINTA',
  'SEXTA',
  'SEPTIMA',
  'OCTAVA',
  'NOVENA',
  'DECIMA',
  'UNDECIMA',
  'DUODECIMA',
  'DECIMOTERCERA',
  'DECIMOCUARTA',
  'DECIMOQUINTA',
  'DECIMOSEXTA',
  'DECIMOSEPTIMA',
  'DECIMOOCTAVA',
  'DECIMONOVENA',
];

/** Tens ordinals 20, 30, 40, 50 */
const TENS: Record<number, string> = {
  20: 'VIGESIMA',
  30: 'TRIGESIMA',
  40: 'CUADRAGESIMA',
  50: 'QUINCUAGESIMA',
};

/**
 * Full ordinal array 1..50, with index 0 as empty sentinel.
 * Compounds are stored as "VIGESIMA PRIMERA", etc.
 */
function buildOrdinales(): readonly string[] {
  const arr: string[] = [''];
  for (let i = 1; i <= 50; i++) {
    if (i <= 19) {
      arr.push(BASE_ORDINALS[i]);
    } else if (i % 10 === 0) {
      arr.push(TENS[i]);
    } else {
      const tens = Math.floor(i / 10) * 10;
      const units = i % 10;
      arr.push(`${TENS[tens]} ${BASE_ORDINALS[units]}`);
    }
  }
  return arr;
}

export const ORDINALES: readonly string[] = buildOrdinales();

/** Build a reverse lookup table (normalized uppercase, accent-stripped) -> index */
function stripAccents(s: string): string {
  return s
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U');
}

const ORDINAL_TO_INDEX = new Map<string, number>();
for (let i = 1; i < ORDINALES.length; i++) {
  const key = stripAccents(ORDINALES[i].toUpperCase());
  ORDINAL_TO_INDEX.set(key, i);
}

/**
 * Convert integer 1..50 to Spanish feminine ordinal string (uppercase).
 * Returns the ORDINALES entry (e.g. intToOrdinal(21) -> "VIGESIMA PRIMERA").
 */
export function intToOrdinal(n: number): string {
  if (n < 1 || n > 50 || !ORDINALES[n]) {
    return `${n}`;
  }
  return ORDINALES[n];
}

/**
 * Convert a Spanish ordinal string to its integer 1..50 value.
 * Case-insensitive and accent-insensitive.
 * Returns null if not recognized.
 */
export function ordinalToInt(ordinal: string): number | null {
  const normalized = stripAccents(ordinal.toUpperCase().trim());
  return ORDINAL_TO_INDEX.get(normalized) ?? null;
}

/** Represents a detected CLÁUSULA header in a plantilla. */
export interface ClausulaHeader {
  indiceLinea: number; // 0-based line index
  ordinal: string; // as written in the text (normalized uppercase)
  numero: number; // resolved integer
  raw: string; // the full matched header string
}

/**
 * Header regex — accent-tolerant on the "CLAÚSULA" word (D-04 marker).
 * Pattern: (optional whitespace) CL[ÁA]USULA <ORDINAL>.-
 * Case-insensitive; captures the ordinal portion.
 */
const HEADER_RE = /^(\s*)(CL[ÁA]USULA)\s+([A-ZÁÉÍÓÚ ]+?)\.-/im;

/**
 * Detect all CLÁUSULA headers in texto.
 * Headers with unrecognized ordinals are skipped (malformed).
 */
export function detectClausulaHeaders(texto: string): ClausulaHeader[] {
  const lines = texto.split('\n');
  const headers: ClausulaHeader[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = HEADER_RE.exec(lines[i]);
    if (!match) continue;

    const rawOrdinal = match[3].trim().toUpperCase();
    const numero = ordinalToInt(rawOrdinal);
    if (numero === null) continue; // malformed — skip

    headers.push({
      indiceLinea: i,
      ordinal: rawOrdinal,
      numero,
      raw: match[0],
    });
  }

  return headers;
}

/**
 * Build the canonical header prefix for output (always accented form).
 */
function buildHeaderPrefix(numero: number): string {
  return `CLÁUSULA ${intToOrdinal(numero)}.-`;
}

/**
 * Insert a new clause into texto after the clause numbered `afterNumero`.
 * afterNumero=0 means insert as the very first clause (top).
 * clausulaTexto is the body WITHOUT the "CLÁUSULA X.-" prefix.
 * All existing headers with numero > afterNumero are shifted +1.
 * Returns the full new text.
 */
export function insertClausulaAndRenumber(
  texto: string,
  clausulaTexto: string,
  afterNumero: number,
): string {
  const lines = texto.split('\n');
  const headers = detectClausulaHeaders(texto);

  // Build the new clause block
  const newClauseNumber = afterNumero + 1;
  const newClauseLine = `${buildHeaderPrefix(newClauseNumber)} ${clausulaTexto}`;

  // Renumber existing headers that need shifting (numero > afterNumero)
  // Build a mutable copy of lines
  const result = [...lines];

  // Apply renumbering to headers in REVERSE order to avoid index confusion
  // (renumbering only changes line content, not line count, so order doesn't matter)
  for (const header of headers) {
    if (header.numero > afterNumero) {
      const newNum = header.numero + 1;
      const oldLine = result[header.indiceLinea];
      // Replace the header portion with the new ordinal
      const newPrefix = buildHeaderPrefix(newNum);
      // Replace the matched header text at the start of the line
      result[header.indiceLinea] = oldLine.replace(HEADER_RE, (m) => {
        // Preserve any leading whitespace
        const leadMatch = /^(\s*)/.exec(m);
        const lead = leadMatch ? leadMatch[1] : '';
        return `${lead}${newPrefix}`;
      });
    }
  }

  // Find the insertion point
  if (afterNumero === 0) {
    // Insert at top (before any existing content or before first header)
    const firstHeaderIdx = headers.length > 0 ? headers[0].indiceLinea : 0;
    result.splice(firstHeaderIdx, 0, newClauseLine);
  } else {
    // Find the header with numero === afterNumero
    const afterHeader = headers.find((h) => h.numero === afterNumero);
    if (afterHeader) {
      // Insert after the block — find the next header to know where this clause ends
      const nextHeader = headers.find((h) => h.numero === afterNumero + 1);
      let insertAt: number;
      if (nextHeader) {
        // Insert before the (now-renumbered) next header
        insertAt = nextHeader.indiceLinea;
      } else {
        // Insert at end of document
        insertAt = result.length;
      }
      result.splice(insertAt, 0, newClauseLine);
    } else {
      // afterNumero not found — append at end
      result.push(newClauseLine);
    }
  }

  return result.join('\n');
}
